using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class CreateInquiryRequest
{
    [Required, StringLength(80)]
    public string FirstName { get; init; } = string.Empty;

    [Required, StringLength(80)]
    public string LastName { get; init; } = string.Empty;

    [Required, EmailAddress, StringLength(254)]
    public string Email { get; init; } = string.Empty;

    [Required, Phone, StringLength(40)]
    public string Phone { get; init; } = string.Empty;

    [Required, StringLength(120)]
    public string VehicleSlug { get; init; } = string.Empty;

    [StringLength(2_000)]
    public string Message { get; init; } = string.Empty;

    [Url, StringLength(2_000)]
    public string? PageUrl { get; init; }
}
