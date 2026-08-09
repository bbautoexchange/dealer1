using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Models;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class MetaConversionsClient(
    HttpClient httpClient,
    IOptions<MetaConversionsOptions> options,
    ILogger<MetaConversionsClient> logger) : IMetaConversionsClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task TrackLeadAsync(WebsiteLead lead, string? eventId, HttpRequest request, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        var accessToken = FirstNonEmpty(
            settings.AccessToken,
            Environment.GetEnvironmentVariable("META_CAPI_ACCESS_TOKEN"),
            Environment.GetEnvironmentVariable("MetaConversions__AccessToken"));
        var pixelId = FirstNonEmpty(
            settings.PixelId,
            Environment.GetEnvironmentVariable("META_CAPI_PIXEL_ID"),
            "4653850014938779");

        if (string.IsNullOrWhiteSpace(accessToken) || string.IsNullOrWhiteSpace(pixelId))
        {
            logger.LogDebug("Meta Conversions API is not configured; no server-side lead event was sent.");
            return;
        }

        var userData = new Dictionary<string, object>();
        AddHashedValue(userData, "em", NormalizeEmail(lead.Email));
        AddHashedValue(userData, "ph", NormalizePhone(lead.Phone));
        AddHashedValue(userData, "fn", NormalizeName(lead.FirstName));
        AddHashedValue(userData, "ln", NormalizeName(lead.LastName));
        AddValue(userData, "fbp", request.Cookies["_fbp"]);
        AddValue(userData, "fbc", request.Cookies["_fbc"]);
        AddValue(userData, "client_user_agent", request.Headers.UserAgent.ToString());
        AddValue(userData, "client_ip_address", GetClientIpAddress(request));

        var payload = new Dictionary<string, object>
        {
            ["data"] = new[]
            {
                new Dictionary<string, object>
                {
                    ["event_name"] = "Lead",
                    ["event_time"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds(),
                    ["event_id"] = string.IsNullOrWhiteSpace(eventId) ? Guid.NewGuid().ToString("N") : eventId.Trim(),
                    ["event_source_url"] = lead.PageUrl ?? request.GetDisplayUrl(),
                    ["action_source"] = "website",
                    ["user_data"] = userData,
                    ["custom_data"] = new Dictionary<string, object>
                    {
                        ["content_name"] = lead.Name,
                        ["content_category"] = lead.Source
                    }
                }
            },
            ["access_token"] = accessToken
        };

        if (!string.IsNullOrWhiteSpace(settings.TestEventCode))
        {
            payload["test_event_code"] = settings.TestEventCode.Trim();
        }

        try
        {
            var version = settings.GraphApiVersion.Trim().Trim('/');
            using var content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");
            using var response = await httpClient.PostAsync($"{version}/{pixelId}/events", content, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                logger.LogInformation("Meta Conversions API accepted a server-side lead event for {LeadSource}.", lead.Source);
                return;
            }

            logger.LogWarning("Meta Conversions API rejected a server-side lead event with status {StatusCode}.", (int)response.StatusCode);
        }
        catch (HttpRequestException exception)
        {
            logger.LogWarning(exception, "Meta Conversions API could not receive a server-side lead event.");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning("Meta Conversions API timed out while sending a server-side lead event.");
        }
    }

    private static void AddHashedValue(Dictionary<string, object> values, string name, string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return;
        values[name] = new[] { Hash(value) };
    }

    private static void AddValue(Dictionary<string, object> values, string name, string? value)
    {
        if (!string.IsNullOrWhiteSpace(value)) values[name] = value.Trim();
    }

    private static string? NormalizeEmail(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();

    private static string? NormalizePhone(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var digits = new string(value.Where(char.IsDigit).ToArray());
        return digits.Length == 10 ? $"1{digits}" : digits;
    }

    private static string? NormalizeName(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();

    private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

    private static string? GetClientIpAddress(HttpRequest request)
    {
        var forwarded = request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwarded)) return forwarded.Split(',', 2)[0].Trim();
        return request.HttpContext.Connection.RemoteIpAddress?.ToString();
    }

    private static string FirstNonEmpty(params string?[] values) => values.FirstOrDefault(value => !string.IsNullOrWhiteSpace(value))?.Trim() ?? string.Empty;
}
