using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class NewsletterRequest
{
    [Required, EmailAddress, StringLength(254)] public string Email { get; init; } = string.Empty;
    [Url, StringLength(2_000)] public string? PageUrl { get; init; }
    [StringLength(100)] public string? MetaEventId { get; init; }
    [StringLength(2_000)] public string? Attribution { get; init; }
}
