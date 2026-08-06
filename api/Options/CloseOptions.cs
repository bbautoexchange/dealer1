namespace RetroDrive.Api.Options;

public sealed class CloseOptions
{
    public const string SectionName = "Close";

    public string ApiKey { get; init; } = string.Empty;
    public string StatusId { get; init; } = string.Empty;
    public Dictionary<string, string> CustomFieldIds { get; init; } = new();
}
