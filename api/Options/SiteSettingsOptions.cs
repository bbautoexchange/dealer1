namespace RetroDrive.Api.Options;

public sealed class SiteSettingsOptions
{
    public const string SectionName = "SiteSettings";

    public string? ShowroomAddress { get; init; }
    public string? Phone { get; init; }
    public string? Email { get; init; }
    public string? ShowroomHours { get; init; }
}
