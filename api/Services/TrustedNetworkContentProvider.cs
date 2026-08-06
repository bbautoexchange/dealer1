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
            new TrustMetric("15+", "Years in business", "Built around collector cars"),
            new TrustMetric("1.2K+", "Vehicles delivered", "Nationwide delivery support"),
            new TrustMetric("98%", "Client satisfaction", "Based on buyer feedback"),
            new TrustMetric("50", "States served", "Door-to-door availability")
        ],
        "Trusted network",
        "LICENSED & PARTNERED",
        "The specialists behind your purchase, financing, and delivery work together to keep each step clear.",
        [
            new TrustCredential("licensed", "Licensed Motor Vehicle Dealer", "License details are provided with your purchase documentation.", "Verified"),
            new TrustCredential("authorized", "Authorized Dealer", "Curated classic, collector, and performance inventory.", "Authorized"),
            new TrustCredential("certified", "Certified Classic Dealer", "Vehicle histories, condition notes, and delivery planning in one place.", "Certified")
        ],
        [
            new TrustPartner("ALLY", "Ally Financial", "Auto financing", "/partners/ally.svg"),
            new TrustPartner("CAP", "Capital One", "Auto finance", "/partners/capitalone.svg"),
            new TrustPartner("MON", "Montway", "Vehicle transport", "/partners/montway.svg"),
            new TrustPartner("AT", "AutoTrader", "Marketplace", "/partners/autotrader.svg"),
            new TrustPartner("CARFAX", "Carfax", "Vehicle history", "/partners/carfax.svg"),
            new TrustPartner("CS", "CarShield", "Extended warranty", "/partners/carshield.svg")
        ]);
}
