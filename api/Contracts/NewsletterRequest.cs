using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class NewsletterRequest
{
    [Required, StringLength(160)] public string FullName { get; init; } = string.Empty;
    [Required, Phone, StringLength(40)] public string Phone { get; init; } = string.Empty;
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = string.Empty;
    [Url, StringLength(2_000)] public string? PageUrl { get; init; }
    [StringLength(100)] public string? MetaEventId { get; init; }
    [StringLength(2_000)] public string? Attribution { get; init; }
}
