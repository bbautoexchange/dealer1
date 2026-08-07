using System.Text.Json;
using Microsoft.Data.Sqlite;
using RetroDrive.Api.Models;

namespace RetroDrive.Api.Services;

public sealed class InventoryStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly VehicleCatalog seedCatalog;
    private readonly string databasePath;
    private readonly string connectionString;

    public InventoryStore(IWebHostEnvironment environment, IConfiguration configuration, VehicleCatalog seedCatalog)
    {
        this.seedCatalog = seedCatalog;
        databasePath = configuration["Inventory:DatabasePath"]
            ?? Path.Combine(environment.ContentRootPath, "App_Data", "retrodrive.db");
        connectionString = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Cache = SqliteCacheMode.Shared
        }.ToString();
    }

    public async Task InitializeAsync(CancellationToken cancellationToken = default)
    {
        var databaseDirectory = Path.GetDirectoryName(databasePath);
        if (!string.IsNullOrWhiteSpace(databaseDirectory)) Directory.CreateDirectory(databaseDirectory);

        await using var connection = await OpenAsync(cancellationToken);
        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                CREATE TABLE IF NOT EXISTS vehicles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    slug TEXT NOT NULL,
                    year INTEGER NOT NULL,
                    make TEXT NOT NULL,
                    model TEXT NOT NULL,
                    price REAL NOT NULL,
                    price_text TEXT NULL,
                    msrp REAL NULL,
                    mileage INTEGER NOT NULL,
                    vin TEXT NOT NULL,
                    exterior_color TEXT NOT NULL,
                    interior_color TEXT NOT NULL,
                    engine TEXT NOT NULL,
                    horsepower TEXT NOT NULL,
                    transmission TEXT NOT NULL,
                    body_style TEXT NOT NULL,
                    location TEXT NOT NULL,
                    stock_number TEXT NOT NULL,
                    description TEXT NOT NULL,
                    features_json TEXT NOT NULL,
                    photo_public_ids_json TEXT NOT NULL,
                    is_published INTEGER NOT NULL DEFAULT 0,
                    created_at TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ux_vehicles_slug ON vehicles(slug);
                CREATE INDEX IF NOT EXISTS ix_vehicles_published ON vehicles(is_published, created_at DESC);
                """;
            await command.ExecuteNonQueryAsync(cancellationToken);
        }

        await EnsurePriceTextColumnAsync(connection, cancellationToken);

        await using var countCommand = connection.CreateCommand();
        countCommand.CommandText = "SELECT COUNT(*) FROM vehicles;";
        var count = Convert.ToInt32(await countCommand.ExecuteScalarAsync(cancellationToken));
        if (count == 0)
        {
            foreach (var vehicle in seedCatalog.GetAll())
            {
                await InsertAsync(connection, vehicle, true, DateTimeOffset.UtcNow, cancellationToken);
            }
        }

        await using var optimizeCommand = connection.CreateCommand();
        optimizeCommand.CommandText = "PRAGMA optimize;";
        await optimizeCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<InventoryVehicle>> GetPublishedAsync(CancellationToken cancellationToken = default) =>
        await QueryAsync("WHERE is_published = 1 ORDER BY created_at DESC", cancellationToken);

    public async Task<InventoryVehicle?> FindPublishedBySlugAsync(string slug, CancellationToken cancellationToken = default)
    {
        var vehicles = await QueryAsync("WHERE is_published = 1 AND slug = $slug LIMIT 1", cancellationToken, (command) =>
            command.Parameters.AddWithValue("$slug", slug.Trim()));
        return vehicles.FirstOrDefault();
    }

    public async Task<IReadOnlyList<InventoryVehicle>> GetAllAsync(CancellationToken cancellationToken = default) =>
        await QueryAsync("ORDER BY is_published DESC, created_at DESC", cancellationToken);

    public async Task<InventoryVehicle?> FindByIdAsync(long id, CancellationToken cancellationToken = default)
    {
        var vehicles = await QueryAsync("WHERE id = $id LIMIT 1", cancellationToken, command =>
            command.Parameters.AddWithValue("$id", id));
        return vehicles.FirstOrDefault();
    }

    public async Task<InventoryVehicle> CreateAsync(Vehicle vehicle, bool published, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenAsync(cancellationToken);
        var createdAt = DateTimeOffset.UtcNow;
        var id = await InsertAsync(connection, vehicle, published, createdAt, cancellationToken);
        return new InventoryVehicle(id, vehicle, published, createdAt);
    }

    public async Task<IReadOnlyList<InventoryVehicle>> CreateManyAsync(
        IReadOnlyList<(Vehicle Vehicle, bool Published)> vehicles,
        CancellationToken cancellationToken = default)
    {
        if (vehicles.Count == 0) return [];

        await using var connection = await OpenAsync(cancellationToken);
        await using var transaction = (SqliteTransaction)await connection.BeginTransactionAsync(cancellationToken);
        var createdAt = DateTimeOffset.UtcNow;
        var created = new List<InventoryVehicle>(vehicles.Count);

        foreach (var (vehicle, published) in vehicles)
        {
            var id = await InsertAsync(connection, vehicle, published, createdAt, cancellationToken, transaction);
            created.Add(new InventoryVehicle(id, vehicle, published, createdAt));
        }

        await transaction.CommitAsync(cancellationToken);
        return created;
    }

    public async Task<bool> SetPublishedAsync(long id, bool published, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "UPDATE vehicles SET is_published = $published WHERE id = $id;";
        command.Parameters.AddWithValue("$published", published ? 1 : 0);
        command.Parameters.AddWithValue("$id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    public async Task<InventoryVehicle?> UpdateAsync(long id, Vehicle vehicle, bool published, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = """
            UPDATE vehicles SET
                slug = $slug, year = $year, make = $make, model = $model, price = $price, price_text = $priceText, msrp = $msrp,
                mileage = $mileage, vin = $vin, exterior_color = $exteriorColor, interior_color = $interiorColor,
                engine = $engine, horsepower = $horsepower, transmission = $transmission, body_style = $bodyStyle,
                location = $location, stock_number = $stockNumber, description = $description,
                features_json = $features, photo_public_ids_json = $photoIds, is_published = $published
            WHERE id = $id;
            """;
        AddVehicleParameters(command, vehicle, published);
        command.Parameters.AddWithValue("$id", id);

        if (await command.ExecuteNonQueryAsync(cancellationToken) != 1) return null;
        return await FindByIdAsync(id, cancellationToken);
    }

    public async Task<bool> DeleteAsync(long id, CancellationToken cancellationToken = default)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = "DELETE FROM vehicles WHERE id = $id;";
        command.Parameters.AddWithValue("$id", id);
        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private async Task<IReadOnlyList<InventoryVehicle>> QueryAsync(
        string whereAndOrder,
        CancellationToken cancellationToken,
        Action<SqliteCommand>? configure = null)
    {
        await using var connection = await OpenAsync(cancellationToken);
        await using var command = connection.CreateCommand();
        command.CommandText = $"""
            SELECT id, slug, year, make, model, price, msrp, mileage, vin, exterior_color, interior_color,
                   engine, horsepower, transmission, body_style, location, stock_number, description,
                   features_json, photo_public_ids_json, is_published, created_at, price_text
            FROM vehicles
            {whereAndOrder};
            """;
        configure?.Invoke(command);

        var vehicles = new List<InventoryVehicle>();
        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            vehicles.Add(ReadVehicle(reader));
        }
        return vehicles;
    }

    private static async Task<long> InsertAsync(
        SqliteConnection connection,
        Vehicle vehicle,
        bool published,
        DateTimeOffset createdAt,
        CancellationToken cancellationToken,
        SqliteTransaction? transaction = null)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO vehicles (
                slug, year, make, model, price, price_text, msrp, mileage, vin, exterior_color, interior_color, engine,
                horsepower, transmission, body_style, location, stock_number, description, features_json,
                photo_public_ids_json, is_published, created_at)
            VALUES (
                $slug, $year, $make, $model, $price, $priceText, $msrp, $mileage, $vin, $exteriorColor, $interiorColor, $engine,
                $horsepower, $transmission, $bodyStyle, $location, $stockNumber, $description, $features,
                $photoIds, $published, $createdAt);
            SELECT last_insert_rowid();
            """;
        AddVehicleParameters(command, vehicle, published);
        command.Parameters.AddWithValue("$createdAt", createdAt.ToString("O"));
        return Convert.ToInt64(await command.ExecuteScalarAsync(cancellationToken));
    }

    private static void AddVehicleParameters(SqliteCommand command, Vehicle vehicle, bool published)
    {
        command.Parameters.AddWithValue("$slug", vehicle.Slug);
        command.Parameters.AddWithValue("$year", vehicle.Year);
        command.Parameters.AddWithValue("$make", vehicle.Make);
        command.Parameters.AddWithValue("$model", vehicle.Model);
        command.Parameters.AddWithValue("$price", vehicle.Price);
        command.Parameters.AddWithValue("$priceText", string.IsNullOrWhiteSpace(vehicle.PriceText) ? DBNull.Value : vehicle.PriceText);
        command.Parameters.AddWithValue("$msrp", vehicle.Msrp is null ? DBNull.Value : vehicle.Msrp.Value);
        command.Parameters.AddWithValue("$mileage", vehicle.Mileage);
        command.Parameters.AddWithValue("$vin", vehicle.Vin);
        command.Parameters.AddWithValue("$exteriorColor", vehicle.ExteriorColor);
        command.Parameters.AddWithValue("$interiorColor", vehicle.InteriorColor);
        command.Parameters.AddWithValue("$engine", vehicle.Engine);
        command.Parameters.AddWithValue("$horsepower", vehicle.Horsepower);
        command.Parameters.AddWithValue("$transmission", vehicle.Transmission);
        command.Parameters.AddWithValue("$bodyStyle", vehicle.BodyStyle);
        command.Parameters.AddWithValue("$location", vehicle.Location);
        command.Parameters.AddWithValue("$stockNumber", vehicle.StockNumber);
        command.Parameters.AddWithValue("$description", vehicle.Description);
        command.Parameters.AddWithValue("$features", JsonSerializer.Serialize(vehicle.Features, JsonOptions));
        command.Parameters.AddWithValue("$photoIds", JsonSerializer.Serialize(vehicle.PhotoPublicIds, JsonOptions));
        command.Parameters.AddWithValue("$published", published ? 1 : 0);
    }

    private async Task<SqliteConnection> OpenAsync(CancellationToken cancellationToken)
    {
        var connection = new SqliteConnection(connectionString);
        await connection.OpenAsync(cancellationToken);
        return connection;
    }

    private static InventoryVehicle ReadVehicle(SqliteDataReader reader)
    {
        var vehicle = new Vehicle(
            reader.GetString(1),
            reader.GetInt32(2),
            reader.GetString(3),
            reader.GetString(4),
            reader.GetDecimal(5),
            reader.IsDBNull(22) ? null : reader.GetString(22),
            reader.GetInt32(7),
            reader.GetString(8),
            reader.GetString(9),
            reader.GetString(10),
            reader.GetString(11),
            reader.GetString(12),
            reader.GetString(13),
            reader.GetString(14),
            reader.GetString(15),
            reader.GetString(16),
            reader.IsDBNull(6) ? null : reader.GetDecimal(6),
            reader.GetString(17),
            JsonSerializer.Deserialize<List<string>>(reader.GetString(18), JsonOptions) ?? [],
            JsonSerializer.Deserialize<List<string>>(reader.GetString(19), JsonOptions) ?? []);

        return new InventoryVehicle(
            reader.GetInt64(0),
            vehicle,
            reader.GetInt64(20) == 1,
            DateTimeOffset.Parse(reader.GetString(21), null, System.Globalization.DateTimeStyles.RoundtripKind));
    }

    private static async Task EnsurePriceTextColumnAsync(SqliteConnection connection, CancellationToken cancellationToken)
    {
        await using var check = connection.CreateCommand();
        check.CommandText = "PRAGMA table_info(vehicles);";
        await using var reader = await check.ExecuteReaderAsync(cancellationToken);
        while (await reader.ReadAsync(cancellationToken))
        {
            if (string.Equals(reader.GetString(1), "price_text", StringComparison.OrdinalIgnoreCase)) return;
        }

        await using var migration = connection.CreateCommand();
        migration.CommandText = "ALTER TABLE vehicles ADD COLUMN price_text TEXT NULL;";
        await migration.ExecuteNonQueryAsync(cancellationToken);
    }
}
