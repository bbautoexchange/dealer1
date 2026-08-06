namespace RetroDrive.Api.Options;

public sealed class TrustedNetworkOptions
{
    public const string SectionName = "TrustedNetwork";

    // Supplied through Render as TrustedNetwork__ContentJson.
    public string? ContentJson { get; init; }
}
