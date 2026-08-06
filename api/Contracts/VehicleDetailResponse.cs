namespace RetroDrive.Api.Contracts;

public sealed record VehicleDetailResponse(
    string Slug,
    int Year,
    string Make,
    string Model,
    decimal Price,
    string? PriceText,
    int Mileage,
    string Vin,
    string ExteriorColor,
    string InteriorColor,
    string Engine,
    string Horsepower,
    string Transmission,
    string BodyStyle,
    string Location,
    string StockNumber,
    decimal? Msrp,
    string Description,
    IReadOnlyList<string> Features,
    IReadOnlyList<string> ImageUrls);
