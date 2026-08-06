using Microsoft.AspNetCore.Mvc;
using RetroDrive.Api.Contracts;
using RetroDrive.Api.Services;

namespace RetroDrive.Api.Controllers;

[ApiController]
[Route("api/vehicles")]
public sealed class VehiclesController(InventoryStore inventory, CloudinaryUrlBuilder images) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<VehicleSummaryResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<VehicleSummaryResponse>>> GetAll(CancellationToken cancellationToken)
    {
        var vehicles = (await inventory.GetPublishedAsync(cancellationToken)).Select(item =>
        {
            var vehicle = item.Vehicle;
            return new VehicleSummaryResponse(
                vehicle.Slug,
                vehicle.Year,
                vehicle.Make,
                vehicle.Model,
                vehicle.Price,
                vehicle.PriceText,
                vehicle.Msrp,
                vehicle.Mileage,
                vehicle.ExteriorColor,
                vehicle.StockNumber,
                images.BuildImageUrl(vehicle.PhotoPublicIds[0], 900));
        }).ToList();

        return Ok(vehicles);
    }

    [HttpGet("{slug}")]
    [ProducesResponseType<VehicleDetailResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VehicleDetailResponse>> GetBySlug(string slug, CancellationToken cancellationToken)
    {
        var item = await inventory.FindPublishedBySlugAsync(slug, cancellationToken);
        if (item is null)
        {
            return NotFound();
        }

        var vehicle = item.Vehicle;

        return Ok(new VehicleDetailResponse(
            vehicle.Slug,
            vehicle.Year,
            vehicle.Make,
            vehicle.Model,
            vehicle.Price,
            vehicle.PriceText,
            vehicle.Mileage,
            vehicle.Vin,
            vehicle.ExteriorColor,
            vehicle.InteriorColor,
            vehicle.Engine,
            vehicle.Horsepower,
            vehicle.Transmission,
            vehicle.BodyStyle,
            vehicle.Location,
            vehicle.StockNumber,
            vehicle.Msrp,
            vehicle.Description,
            vehicle.Features,
            vehicle.PhotoPublicIds.Select(photo => images.BuildImageUrl(photo)).ToList()));
    }
}
