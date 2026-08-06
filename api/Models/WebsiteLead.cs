namespace RetroDrive.Api.Models;

public sealed record WebsiteLead(
    string Name,
    string FirstName,
    string LastName,
    string Email,
    string? Phone,
    string Description,
    string? PageUrl,
    string Source = "Website",
    string? Vehicle = null,
    string? Vin = null,
    string? Price = null);
