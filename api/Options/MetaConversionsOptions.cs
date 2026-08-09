namespace RetroDrive.Api.Options;

public sealed class MetaConversionsOptions
{
    public const string SectionName = "MetaConversions";

    public string PixelId { get; init; } = "4653850014938779";
    public string AccessToken { get; init; } = string.Empty;
    public string GraphApiVersion { get; init; } = "v24.0";
    public string TestEventCode { get; init; } = string.Empty;
}
