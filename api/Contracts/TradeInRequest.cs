using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class TradeInRequest
{
    [Required, StringLength(80)] public string FirstName { get; init; } = string.Empty;
    [Required, StringLength(80)] public string LastName { get; init; } = string.Empty;
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = string.Empty;
    [Required, Phone, StringLength(40)] public string Phone { get; init; } = string.Empty;
    [Range(1886, 2100)] public int Year { get; init; }
    [Required, StringLength(80)] public string Make { get; init; } = string.Empty;
    [Required, StringLength(100)] public string Model { get; init; } = string.Empty;
    [Range(0, 2_000_000)] public int Mileage { get; init; }
    [StringLength(200)] public string Condition { get; init; } = string.Empty;
    [StringLength(2_000)] public string Message { get; init; } = string.Empty;
    [Url, StringLength(2_000)] public string? PageUrl { get; init; }
}
