namespace RetroDrive.Api.Models;

public sealed record SiteSettingsContent(
    string ShowroomAddress,
    string Phone,
    string Email,
    string ShowroomHours);
