using Microsoft.AspNetCore.Mvc;
using RetroDrive.Api.Contracts;
using RetroDrive.Api.Models;
using RetroDrive.Api.Services;

namespace RetroDrive.Api.Controllers;

[ApiController]
[Route("api/leads")]
public sealed class WebsiteLeadsController(
    ICloseLeadClient closeLeadClient,
    IMetaConversionsClient metaConversions,
    ILogger<WebsiteLeadsController> logger) : ControllerBase
{
    [HttpPost("finance")]
    public Task<ActionResult<CreateInquiryResponse>> Finance([FromBody] FinanceApplicationRequest request, CancellationToken cancellationToken)
    {
        var vehicleName = string.IsNullOrWhiteSpace(request.VehicleName) ? "Vehicle not selected" : request.VehicleName.Trim();
        var vehicleVin = string.IsNullOrWhiteSpace(request.VehicleVin) ? "Not provided" : request.VehicleVin.Trim();
        var vehiclePrice = string.IsNullOrWhiteSpace(request.VehiclePriceLabel) ? $"${request.VehiclePrice:N0}" : request.VehiclePriceLabel.Trim();

        return Deliver(new WebsiteLead($"Website finance application - {vehicleName}", request.FirstName, request.LastName, request.Email, request.Phone,
            $"Finance inquiry\n\nVehicle: {vehicleName}\nVIN: {vehicleVin}\nVehicle price: {vehiclePrice}\nDown payment: ${request.DownPayment:N0}\nEstimated APR: {request.InterestRate:0.##}%\nTerm: {request.TermMonths} months\nSource: Website", request.PageUrl, "Website finance application", vehicleName, request.VehicleVin, vehiclePrice, request.Attribution, request.SmsCustomerCareConsent, request.SmsMarketingConsent),
            "Your finance request has been received. A specialist will follow up shortly.", request.MetaEventId, cancellationToken);
    }

    [HttpPost("trade-in")]
    public Task<ActionResult<CreateInquiryResponse>> TradeIn([FromBody] TradeInRequest request, CancellationToken cancellationToken) =>
        Deliver(new WebsiteLead("Website trade-in appraisal", request.FirstName, request.LastName, request.Email, request.Phone,
            $"Trade-in appraisal request\n\nVehicle: {request.Year} {request.Make} {request.Model}\nMileage: {request.Mileage:N0}\nCondition: {request.Condition}\nMessage: {request.Message}\nSource: Website", request.PageUrl, "Website trade-in", Attribution: request.Attribution, SmsCustomerCareConsent: request.SmsCustomerCareConsent, SmsMarketingConsent: request.SmsMarketingConsent),
            "Your appraisal request has been received. We will be in touch shortly.", request.MetaEventId, cancellationToken);

    [HttpPost("newsletter")]
    public Task<ActionResult<CreateInquiryResponse>> Newsletter([FromBody] NewsletterRequest request, CancellationToken cancellationToken)
    {
        var name = request.FullName.Trim().Split(' ', 2, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        var firstName = name.FirstOrDefault() ?? "VIP";
        var lastName = name.Skip(1).FirstOrDefault() ?? "Subscriber";

        return Deliver(new WebsiteLead("Website VIP list subscription", firstName, lastName, request.Email, request.Phone,
            $"VIP list subscription\n\nFull name: {request.FullName.Trim()}\nPhone: {request.Phone.Trim()}\nSource: Website VIP list", request.PageUrl, "Website VIP list", Attribution: request.Attribution, SmsCustomerCareConsent: request.SmsCustomerCareConsent, SmsMarketingConsent: request.SmsMarketingConsent),
            "You are on the B & B Auto Exchange VIP list. Watch your inbox for new arrivals.", request.MetaEventId, cancellationToken);
    }

    [HttpPost("delivery")]
    public Task<ActionResult<CreateInquiryResponse>> Delivery([FromBody] DeliveryQuoteRequest request, CancellationToken cancellationToken) =>
        Deliver(new WebsiteLead("Website delivery quote", request.FirstName, request.LastName, request.Email, request.Phone,
            $"Delivery quote request\n\nDestination: {request.Destination}\nEstimated route: {request.DistanceMiles:N0} miles\nVehicle: {request.Vehicle ?? "Not selected"}\nSource: Website", request.PageUrl, "Website delivery quote", Attribution: request.Attribution, SmsCustomerCareConsent: request.SmsCustomerCareConsent, SmsMarketingConsent: request.SmsMarketingConsent),
            "Your delivery quote request has been received. Our logistics team will follow up shortly.", request.MetaEventId, cancellationToken);

    private async Task<ActionResult<CreateInquiryResponse>> Deliver(WebsiteLead lead, string successMessage, string? metaEventId, CancellationToken cancellationToken)
    {
        try
        {
            await closeLeadClient.CreateLeadAsync(lead, cancellationToken);
            await metaConversions.TrackLeadAsync(lead, metaEventId, Request, cancellationToken);
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
