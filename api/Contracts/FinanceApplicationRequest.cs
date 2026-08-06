using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class FinanceApplicationRequest
{
    [Required, StringLength(80)] public string FirstName { get; init; } = string.Empty;
    [Required, StringLength(80)] public string LastName { get; init; } = string.Empty;
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = string.Empty;
    [Required, Phone, StringLength(40)] public string Phone { get; init; } = string.Empty;
    [Range(1_000, 2_000_000)] public decimal VehiclePrice { get; init; }
    [Range(0, 2_000_000)] public decimal DownPayment { get; init; }
    [Range(0, 35)] public decimal InterestRate { get; init; }
    [Range(12, 96)] public int TermMonths { get; init; }
    [StringLength(180)] public string? VehicleName { get; init; }
    [StringLength(80)] public string? VehicleVin { get; init; }
    [StringLength(120)] public string? VehicleSlug { get; init; }
    [StringLength(120)] public string? VehiclePriceLabel { get; init; }
    [Url, StringLength(2_000)] public string? PageUrl { get; init; }
}
