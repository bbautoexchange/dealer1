using Microsoft.AspNetCore.Mvc;
using RetroDrive.Api.Contracts;
using RetroDrive.Api.Models;
using RetroDrive.Api.Services;

namespace RetroDrive.Api.Controllers;

[ApiController]
[Route("api/leads")]
public sealed class WebsiteLeadsController(ICloseLeadClient closeLeadClient, ILogger<WebsiteLeadsController> logger) : ControllerBase
{
    [HttpPost("finance")]
    public Task<ActionResult<CreateInquiryResponse>> Finance([FromBody] FinanceApplicationRequest request, CancellationToken cancellationToken)
    {
        var vehicleName = string.IsNullOrWhiteSpace(request.VehicleName) ? "Vehicle not selected" : request.VehicleName.Trim();
        var vehicleVin = string.IsNullOrWhiteSpace(request.VehicleVin) ? "Not provided" : request.VehicleVin.Trim();
        var vehiclePrice = string.IsNullOrWhiteSpace(request.VehiclePriceLabel) ? $"${request.VehiclePrice:N0}" : request.VehiclePriceLabel.Trim();

        return Deliver(new WebsiteLead($"Website finance application - {vehicleName}", request.FirstName, request.LastName, request.Email, request.Phone,
            $"Finance inquiry\n\nVehicle: {vehicleName}\nVIN: {vehicleVin}\nVehicle price: {vehiclePrice}\nDown payment: ${request.DownPayment:N0}\nEstimated APR: {request.InterestRate:0.##}%\nTerm: {request.TermMonths} months\nSource: Website", request.PageUrl, "Website finance application", vehicleName, request.VehicleVin, vehiclePrice),
            "Your finance request has been received. A specialist will follow up shortly.", cancellationToken);
    }

    [HttpPost("trade-in")]
    public Task<ActionResult<CreateInquiryResponse>> TradeIn([FromBody] TradeInRequest request, CancellationToken cancellationToken) =>
        Deliver(new WebsiteLead("Website trade-in appraisal", request.FirstName, request.LastName, request.Email, request.Phone,
            $"Trade-in appraisal request\n\nVehicle: {request.Year} {request.Make} {request.Model}\nMileage: {request.Mileage:N0}\nCondition: {request.Condition}\nMessage: {request.Message}\nSource: Website", request.PageUrl, "Website trade-in"),
            "Your appraisal request has been received. We will be in touch shortly.", cancellationToken);

    [HttpPost("newsletter")]
    public Task<ActionResult<CreateInquiryResponse>> Newsletter([FromBody] NewsletterRequest request, CancellationToken cancellationToken) =>
        Deliver(new WebsiteLead("Website VIP list subscription", "VIP", "Subscriber", request.Email, null,
            "Requested email alerts for RetroDrive USA arrivals and updates.\nSource: Website VIP list", request.PageUrl, "Website VIP list"),
            "You are on the RetroDrive VIP list. Watch your inbox for new arrivals.", cancellationToken);

    [HttpPost("delivery")]
    public Task<ActionResult<CreateInquiryResponse>> Delivery([FromBody] DeliveryQuoteRequest request, CancellationToken cancellationToken) =>
        Deliver(new WebsiteLead("Website delivery quote", request.FirstName, request.LastName, request.Email, request.Phone,
            $"Delivery quote request\n\nDestination: {request.Destination}\nEstimated route: {request.DistanceMiles:N0} miles\nVehicle: {request.Vehicle ?? "Not selected"}\nSource: Website", request.PageUrl, "Website delivery quote"),
            "Your delivery quote request has been received. Our logistics team will follow up shortly.", cancellationToken);

    private async Task<ActionResult<CreateInquiryResponse>> Deliver(WebsiteLead lead, string successMessage, CancellationToken cancellationToken)
    {
        try
        {
            await closeLeadClient.CreateLeadAsync(lead, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, new CreateInquiryResponse(true, successMessage));
        }
        catch (CloseCrmNotConfiguredException)
        {
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "This form is temporarily unavailable.", detail: "Please try again shortly or contact us directly.");
        }
        catch (HttpRequestException exception)
        {
            logger.LogError(exception, "Close CRM could not receive a {LeadName} lead.", lead.Name);
            return Problem(statusCode: StatusCodes.Status502BadGateway, title: "We could not send your request right now.", detail: "Please try again in a moment or contact us directly.");
        }
    }
}
