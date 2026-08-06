using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class AdminSessionService(IOptions<AdminOptions> options)
{
    public const string CookieName = "retrodrive_admin";

    private readonly AdminOptions settings = options.Value;

    public bool IsConfigured => !string.IsNullOrWhiteSpace(settings.Password) && settings.SessionSecret.Length >= 32;

    public TimeSpan Lifetime => TimeSpan.FromHours(Math.Clamp(settings.SessionHours, 1, 24));

    public bool VerifyPassword(string password)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(password)) return false;

        var expected = Encoding.UTF8.GetBytes(settings.Password);
        var actual = Encoding.UTF8.GetBytes(password);
        return expected.Length == actual.Length && CryptographicOperations.FixedTimeEquals(expected, actual);
    }

    public string CreateToken(DateTimeOffset now)
    {
        var payload = $"{now.Add(Lifetime).ToUnixTimeSeconds()}:{Convert.ToHexString(RandomNumberGenerator.GetBytes(16))}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = Sign(payloadBytes);
        return $"{ToBase64Url(payloadBytes)}.{ToBase64Url(signature)}";
    }

    public bool IsValid(string? token, DateTimeOffset now)
    {
        if (!IsConfigured || string.IsNullOrWhiteSpace(token)) return false;

        var parts = token.Split('.', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length != 2) return false;

        try
        {
            var payload = FromBase64Url(parts[0]);
            var suppliedSignature = FromBase64Url(parts[1]);
            var expectedSignature = Sign(payload);
            if (!CryptographicOperations.FixedTimeEquals(suppliedSignature, expectedSignature)) return false;

            var value = Encoding.UTF8.GetString(payload).Split(':', 2);
            return value.Length == 2 && long.TryParse(value[0], out var expiresAt) && now.ToUnixTimeSeconds() < expiresAt;
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private byte[] Sign(byte[] payload) => HMACSHA256.HashData(Encoding.UTF8.GetBytes(settings.SessionSecret), payload);

    private static string ToBase64Url(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var normalized = value.Replace('-', '+').Replace('_', '/');
        normalized = normalized.PadRight(normalized.Length + (4 - normalized.Length % 4) % 4, '=');
        return Convert.FromBase64String(normalized);
    }
}
