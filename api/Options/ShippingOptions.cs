namespace RetroDrive.Api.Options;

public sealed class ShippingOptions
{
    public const string SectionName = "Shipping";

    // Supplied through Render as Shipping__PickupAddress, Shipping__PickupLatitude, and Shipping__PickupLongitude.
    public string PickupAddress { get; init; } = "B & B Auto Exchange dispatch location";
    public double PickupLatitude { get; init; } = 39.5;
    public double PickupLongitude { get; init; } = -98.35;
}
