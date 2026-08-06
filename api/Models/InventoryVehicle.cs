namespace RetroDrive.Api.Models;

public sealed record InventoryVehicle(long Id, Vehicle Vehicle, bool Published, DateTimeOffset CreatedAt);
