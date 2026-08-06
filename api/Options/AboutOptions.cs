namespace RetroDrive.Api.Options;

public sealed class AboutOptions
{
    public const string SectionName = "About";

    // Supplied through Render as About__ContentJson.
    public string? ContentJson { get; init; }
}
