using System.Net;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class VehicleInquiryCooldown
{
    private readonly string databasePath;
    private readonly string connectionString;
    private readonly TimeSpan cooldown;
    private readonly TimeSpan ipCooldown;

    public VehicleInquiryCooldown(
        IWebHostEnvironment environment,
        IConfiguration configuration,
        IOptions<InquiryCooldownOptions> options)
    {
        databasePath = configuration["Inventory:DatabasePath"]
            ?? Path.Combine(environment.ContentRootPath, "App_Data", "retrodrive.db");
        connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();
        cooldown = TimeSpan.FromHours(Math.Clamp(options.Value.SameVehicleHours, 1, 168));
        ipCooldown = TimeSpan.FromMinutes(Math.Clamp(options.Value.SameVehicleIpMinutes, 1, 1440));
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var databaseDirectory = Path.GetDirectoryName(databasePath);
        if (!string.IsNullOrWhiteSpace(databaseDirectory)) Directory.CreateDirectory(databaseDirectory);

        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS vehicle_inquiry_cooldowns (
                vehicle_slug TEXT NOT NULL,
                identifier_hash TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                PRIMARY KEY (vehicle_slug, identifier_hash)
            );
            CREATE INDEX IF NOT EXISTS ix_vehicle_inquiry_cooldowns_expiry
                ON vehicle_inquiry_cooldowns(expires_at);
            """;
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<InquiryCooldownResult> TryReserveAsync(
        string vehicleSlug,
        string email,
        string phone,
        string? clientIp,
        CancellationToken cancellationToken = default)
    {
        var now = DateTimeOffset.UtcNow;
        var identifiers = GetIdentifiers(email, phone, clientIp, now.Add(cooldown), now.Add(ipCooldown));

        await using var connection = await OpenAsync(cancellationToken);
        await using (var begin = connection.CreateCommand())
        {
            begin.CommandText = "BEGIN IMMEDIATE;";
            await begin.ExecuteNonQueryAsync(cancellationToken);
        }

        try
        {
            await using (var cleanup = connection.CreateCommand())
            {
                cleanup.CommandText = "DELETE FROM vehicle_inquiry_cooldowns WHERE expires_at <= $now;";
                cleanup.Parameters.AddWithValue("$now", now.ToString("O"));
                await cleanup.ExecuteNonQueryAsync(cancellationToken);
            }

            await using (var existing = connection.CreateCommand())
            {
                var parameterNames = AddIdentifierParameters(existing, identifiers);
                existing.CommandText = $"""
                    SELECT MAX(expires_at)
                    FROM vehicle_inquiry_cooldowns
                    WHERE vehicle_slug = $vehicleSlug
                      AND identifier_hash IN ({string.Join(", ", parameterNames)});
                    """;
                existing.Parameters.AddWithValue("$vehicleSlug", vehicleSlug.Trim());
                var value = await existing.ExecuteScalarAsync(cancellationToken);
                if (value is string existingExpiry)
                {
                    await CommitAsync(connection, cancellationToken);
                    return new InquiryCooldownResult(false, DateTimeOffset.Parse(existingExpiry, null, System.Globalization.DateTimeStyles.RoundtripKind));
                }
            }

            foreach (var identifier in identifiers)
            {
                await using var insert = connection.CreateCommand();
                insert.CommandText = """
                    INSERT INTO vehicle_inquiry_cooldowns (vehicle_slug, identifier_hash, expires_at)
                    VALUES ($vehicleSlug, $identifierHash, $expiresAt)
                    ON CONFLICT(vehicle_slug, identifier_hash) DO UPDATE SET expires_at = excluded.expires_at;
                    """;
                insert.Parameters.AddWithValue("$vehicleSlug", vehicleSlug.Trim());
                insert.Parameters.AddWithValue("$identifierHash", identifier.Hash);
                insert.Parameters.AddWithValue("$expiresAt", identifier.ExpiresAt.ToString("O"));
                await insert.ExecuteNonQueryAsync(cancellationToken);
            }

            await CommitAsync(connection, cancellationToken);
            return new InquiryCooldownResult(true, now.Add(cooldown));
        }
        catch
        {
            await RollbackAsync(connection, cancellationToken);
            throw;
        }
    }

    public async Task ReleaseAsync(
        string vehicleSlug,
        string email,
        string phone,
        string? clientIp,
        CancellationToken cancellationToken = default)
    {
        var identifiers = GetIdentifiers(email, phone, clientIp, DateTimeOffset.MinValue, DateTimeOffset.MinValue);
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        var parameterNames = AddIdentifierParameters(command, identifiers);
        command.CommandText = $"""
            DELETE FROM vehicle_inquiry_cooldowns
            WHERE vehicle_slug = $vehicleSlug
              AND identifier_hash IN ({string.Join(", ", parameterNames)});
            """;
        command.Parameters.AddWithValue("$vehicleSlug", vehicleSlug.Trim());
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private async Task<SqliteConnection> OpenAsync(CancellationToken cancellationToken)
    {
        var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static async Task CommitAsync(SqliteConnection connection, CancellationToken cancellationToken)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "COMMIT;";
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task RollbackAsync(SqliteConnection connection, CancellationToken cancellationToken)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "ROLLBACK;";
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string NormalizeEmail(string value) => value.Trim().ToLowerInvariant();

    private static string NormalizePhone(string value)
    {
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 10 ? $"1{digits}" : digits;
    }

    private static IReadOnlyList<CooldownIdentifier> GetIdentifiers(
        string email,
        string phone,
        string? clientIp,
        DateTimeOffset contactExpiresAt,
        DateTimeOffset ipExpiresAt)
    {
        var identifiers = new Dictionary<string, DateTimeOffset>(StringComparer.Ordinal)
        {
            [Hash(NormalizeEmail(email))] = contactExpiresAt,
            [Hash(NormalizePhone(phone))] = contactExpiresAt
        };

        var normalizedIp = NormalizeIp(clientIp);
        if (normalizedIp is not null)
        {
            identifiers[Hash($"ip:{normalizedIp}")] = ipExpiresAt;
        }

        return identifiers
            .Select(identifier => new CooldownIdentifier(identifier.Key, identifier.Value))
            .ToArray();
    }

    private static IReadOnlyList<string> AddIdentifierParameters(
        SqliteCommand command,
        IReadOnlyList<CooldownIdentifier> identifiers)
    {
        var parameterNames = new string[identifiers.Count];
        for (var index = 0; index < identifiers.Count; index++)
        {
            parameterNames[index] = $"$identifier{index}";
            command.Parameters.AddWithValue(parameterNames[index], identifiers[index].Hash);
        }

        return parameterNames;
    }

    private static string? NormalizeIp(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;

        var candidate = value.Split(',', 2, StringSplitOptions.TrimEntries)[0];
        return IPAddress.TryParse(candidate, out var address) ? address.ToString() : null;
    }

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private sealed record CooldownIdentifier(string Hash, DateTimeOffset ExpiresAt);
}

public sealed record InquiryCooldownResult(bool Allowed, DateTimeOffset RetryAfter);
