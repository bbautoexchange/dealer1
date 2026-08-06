namespace RetroDrive.Api.Contracts;

public sealed record VehicleSummaryResponse(
    string Slug,
    int Year,
    string Make,
    string Model,
    decimal Price,
    string? PriceText,
    decimal? Msrp,
    int Mileage,
    string ExteriorColor,
    string StockNumber,
    string ImageUrl);
