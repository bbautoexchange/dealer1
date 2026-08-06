using System.Text.Json;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Models;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class TrustedNetworkContentProvider(
    IOptions<TrustedNetworkOptions> options,
    ILogger<TrustedNetworkContentProvider> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string? contentJson = options.Value.ContentJson;

    public TrustedNetworkContent Get()
    {
        if (string.IsNullOrWhiteSpace(contentJson)) return Default;

        try
        {
            var configured = JsonSerializer.Deserialize<TrustedNetworkContent>(contentJson, JsonOptions);
            if (IsValid(configured)) return MergeWithDefaults(configured!);

            logger.LogWarning("TrustedNetwork:ContentJson is incomplete. Default trusted-network content is being used.");
        }
        catch (JsonException exception)
        {
            logger.LogWarning(exception, "TrustedNetwork:ContentJson is not valid JSON. Default trusted-network content is being used.");
        }

        return Default;
    }

    private static bool IsValid(TrustedNetworkContent? content) =>
        content is not null &&
        content.Metrics is { Count: > 0 } &&
        content.Credentials is { Count: > 0 } &&
        content.Partners is { Count: > 0 } &&
        !string.IsNullOrWhiteSpace(content.Title);

    private static TrustedNetworkContent MergeWithDefaults(TrustedNetworkContent configured)
    {
        var defaults = Default;
        return configured with
        {
            Metrics = AddMissing(configured.Metrics, defaults.Metrics),
            Credentials = AddMissing(configured.Credentials, defaults.Credentials),
            Partners = AddMissing(configured.Partners, defaults.Partners),
            Eyebrow = string.IsNullOrWhiteSpace(configured.Eyebrow) ? defaults.Eyebrow : configured.Eyebrow,
            Description = string.IsNullOrWhiteSpace(configured.Description) ? defaults.Description : configured.Description
        };
    }

    private static IReadOnlyList<T> AddMissing<T>(IReadOnlyList<T> configured, IReadOnlyList<T> defaults) =>
        configured.Count >= defaults.Count ? configured : configured.Concat(defaults.Skip(configured.Count)).ToList();

    private static TrustedNetworkContent Default => new(
        [
            new TrustMetric("Retro only", "Inventory focus", "Classic vehicles with character"),
            new TrustMetric("Vehicle-led", "Every listing", "Specs, photos, and context"),
            new TrustMetric("Nationwide", "Delivery planning", "Route support when needed"),
            new TrustMetric("Direct", "B & B support", "Questions welcomed")
        ],
        "The B & B approach",
        "CLASSICS, KEPT PERSONAL",
        "B & B Auto Exchange keeps the process centered on the vehicle, the details that matter, and a clear next step.",
        [
            new TrustCredential("licensed", "Retro and classic only", "The collection is dedicated to timeless vehicles with real character.", "Focused"),
            new TrustCredential("authorized", "Details before decisions", "Each listing brings together the specifications, condition context, and available media.", "Clear"),
            new TrustCredential("certified", "Personal next steps", "Ask about a vehicle, finance planning, or delivery from the same place.", "Personal")
        ],
        [
            new TrustPartner("01", "Discover", "Browse the collection"),
            new TrustPartner("02", "Review", "Explore the vehicle file"),
            new TrustPartner("03", "Plan", "Finance or delivery"),
            new TrustPartner("04", "Connect", "Talk with B & B")
        ]);
}
