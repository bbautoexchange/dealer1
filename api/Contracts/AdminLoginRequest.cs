using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class AdminLoginRequest
{
    [Required, StringLength(512, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;
}
