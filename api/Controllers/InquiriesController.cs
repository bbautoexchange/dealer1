using Microsoft.AspNetCore.Mvc;
using RetroDrive.Api.Contracts;
using RetroDrive.Api.Models;
using RetroDrive.Api.Services;

namespace RetroDrive.Api.Controllers;

[ApiController]
[Route("api/inquiries")]
public sealed class InquiriesController(
    InventoryStore inventory,
    VehicleInquiryCooldown inquiryCooldown,
    ICloseLeadClient closeLeadClient,
    IMetaConversionsClient metaConversions,
    ILogger<InquiriesController> logger) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType<CreateInquiryResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status502BadGateway)]
    public async Task<ActionResult<CreateInquiryResponse>> Create(
        [FromBody] CreateInquiryRequest inquiry,
        CancellationToken cancellationToken)
    {
        var item = await inventory.FindPublishedBySlugAsync(inquiry.VehicleSlug, cancellationToken);
        if (item is null)
        {
            ModelState.AddModelError(nameof(inquiry.VehicleSlug), "The requested vehicle is not available.");
            return ValidationProblem(ModelState);
        }

        var vehicle = item.Vehicle;
        var clientIp = GetClientIpAddress();
        var reservation = await inquiryCooldown.TryReserveAsync(vehicle.Slug, inquiry.Email, inquiry.Phone, clientIp, cancellationToken);
        if (!reservation.Allowed)
        {
            var remaining = reservation.RetryAfter - DateTimeOffset.UtcNow;
            var waitTime = remaining.TotalHours > 1.5
                ? $"{Math.Max(1, Math.Ceiling(remaining.TotalHours))} hours"
                : $"{Math.Max(1, Math.Ceiling(remaining.TotalMinutes))} minutes";
            return Problem(
                statusCode: StatusCodes.Status429TooManyRequests,
                title: "You have already sent an inquiry for this vehicle.",
                detail: $"To avoid duplicate messages, please wait about {waitTime} before sending another inquiry for the same vehicle. You can also contact B & B Auto Exchange directly if you need to add information.");
        }

        try
        {
            await closeLeadClient.CreateLeadAsync(inquiry, vehicle, cancellationToken);
            await metaConversions.TrackLeadAsync(
                new WebsiteLead(
                    $"Vehicle inquiry - {vehicle.Year} {vehicle.Make} {vehicle.Model}",
                    inquiry.FirstName,
                    inquiry.LastName,
                    inquiry.Email,
                    inquiry.Phone,
                    "Vehicle inquiry submitted from the website.",
                    inquiry.PageUrl,
                    "Website vehicle inquiry",
                    $"{vehicle.Year} {vehicle.Make} {vehicle.Model}"),
                inquiry.MetaEventId,
                Request,
                cancellationToken);
            return StatusCode(StatusCodes.Status201Created, new CreateInquiryResponse(
                true,
                "Thank you — your inquiry has been received. We will be in touch shortly."));
        }
        catch (CloseCrmNotConfiguredException)
        {
            await inquiryCooldown.ReleaseAsync(vehicle.Slug, inquiry.Email, inquiry.Phone, clientIp, cancellationToken);
            return Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Inquiries are temporarily unavailable.",
                detail: "Please try again shortly or contact us directly.");
        }
        catch (HttpRequestException exception)
        {
            await inquiryCooldown.ReleaseAsync(vehicle.Slug, inquiry.Email, inquiry.Phone, clientIp, cancellationToken);
            logger.LogError(exception, "Close CRM could not be reached for vehicle {VehicleSlug}.", vehicle.Slug);
            return Problem(
                statusCode: StatusCodes.Status502BadGateway,
                title: "We could not send your inquiry right now.",
                detail: "Please try again in a moment or contact us directly.");
        }
        catch
        {
            await inquiryCooldown.ReleaseAsync(vehicle.Slug, inquiry.Email, inquiry.Phone, clientIp, cancellationToken);
            throw;
        }
    }

    private string? GetClientIpAddress()
    {
        var forwardedFor = Request.Headers["X-Forwarded-For"].ToString();
        if (!string.IsNullOrWhiteSpace(forwardedFor)) return forwardedFor;

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
