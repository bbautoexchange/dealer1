namespace RetroDrive.Api.Options;

public sealed class InquiryCooldownOptions
{
    public const string SectionName = "InquiryCooldown";

    public int SameVehicleHours { get; init; } = 24;
}
