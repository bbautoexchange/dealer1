namespace RetroDrive.Api.Models;

public sealed record TrustedNetworkContent(
    IReadOnlyList<TrustMetric> Metrics,
    string Eyebrow,
    string Title,
    string Description,
    IReadOnlyList<TrustCredential> Credentials,
    IReadOnlyList<TrustPartner> Partners);

public sealed record TrustMetric(string Value, string Label, string Detail);

public sealed record TrustCredential(string Icon, string Title, string Detail, string Status);

public sealed record TrustPartner(string Mark, string Name, string Category, string? Image = null);
