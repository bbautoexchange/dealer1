namespace RetroDrive.Api.Options;

public sealed class AdminOptions
{
    public const string SectionName = "Admin";

    public string Password { get; init; } = string.Empty;

    public string SessionSecret { get; init; } = string.Empty;

    public int SessionHours { get; init; } = 8;
}
