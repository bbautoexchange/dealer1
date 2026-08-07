using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class CreateAdminVehicleRequest
{
    [StringLength(160)]
    public string? Slug { get; init; }

    [Range(1886, 2100)]
    public int Year { get; init; }

    [Required, StringLength(80)]
    public string Make { get; init; } = string.Empty;

    [Required, StringLength(120)]
    public string Model { get; init; } = string.Empty;

    [Range(typeof(decimal), "0", "100000000")]
    public decimal Price { get; init; }

    [Required, StringLength(120)]
    public string PriceText { get; init; } = string.Empty;

    [Range(typeof(decimal), "0", "100000000")]
    public decimal? Msrp { get; init; }

    [Range(0, 2000000)]
    public int Mileage { get; init; }

    [StringLength(80)]
    public string Vin { get; init; } = string.Empty;

    [StringLength(80)]
    public string ExteriorColor { get; init; } = string.Empty;

    [StringLength(80)]
    public string InteriorColor { get; init; } = string.Empty;

    [StringLength(120)]
    public string Engine { get; init; } = string.Empty;

    [StringLength(80)]
    public string Horsepower { get; init; } = string.Empty;

    [StringLength(120)]
    public string Transmission { get; init; } = string.Empty;

    [StringLength(80)]
    public string BodyStyle { get; init; } = string.Empty;

    [StringLength(160)]
    public string Location { get; init; } = string.Empty;

    [StringLength(80)]
    public string StockNumber { get; init; } = string.Empty;

    [Required, StringLength(5000)]
    public string Description { get; init; } = string.Empty;

    public IReadOnlyList<string>? Features { get; init; }

    [Required, MinLength(1)]
    public IReadOnlyList<string>? PhotoPublicIds { get; init; }

    public bool Published { get; init; }
}
