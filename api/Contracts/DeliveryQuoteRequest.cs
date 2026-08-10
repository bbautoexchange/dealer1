using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class DeliveryQuoteRequest
{
    [Required, StringLength(80)] public string FirstName { get; init; } = string.Empty;
    [Required, StringLength(80)] public string LastName { get; init; } = string.Empty;
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = string.Empty;
    [Required, Phone, StringLength(40)] public string Phone { get; init; } = string.Empty;
    [Required, StringLength(120)] public string Destination { get; init; } = string.Empty;
    [Range(50, 4_000)] public int DistanceMiles { get; init; }
    [StringLength(120)] public string? Vehicle { get; init; }
    [Url, StringLength(2_000)] public string? PageUrl { get; init; }
    [StringLength(100)] public string? MetaEventId { get; init; }
    [StringLength(2_000)] public string? Attribution { get; init; }
    public bool SmsCustomerCareConsent { get; init; }
    public bool SmsMarketingConsent { get; init; }
}
