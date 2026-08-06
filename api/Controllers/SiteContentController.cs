using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Models;
using RetroDrive.Api.Options;
using RetroDrive.Api.Services;

namespace RetroDrive.Api.Controllers;

[ApiController]
[Route("api/site")]
public sealed class SiteContentController(
    TrustedNetworkContentProvider trustedNetwork,
    AboutContentProvider about,
    IOptions<ShippingOptions> shipping,
    IOptions<SiteSettingsOptions> siteSettings) : ControllerBase
{
    [HttpGet("trusted-network")]
    [ProducesResponseType<TrustedNetworkContent>(StatusCodes.Status200OK)]
    public ActionResult<TrustedNetworkContent> GetTrustedNetwork() => Ok(trustedNetwork.Get());

    [HttpGet("about")]
    [ProducesResponseType<AboutContent>(StatusCodes.Status200OK)]
    public ActionResult<AboutContent> GetAbout() => Ok(about.Get());

    [HttpGet("settings")]
    [ProducesResponseType<SiteSettingsContent>(StatusCodes.Status200OK)]
    public ActionResult<SiteSettingsContent> GetSiteSettings()
    {
        var configured = siteSettings.Value;
        var contact = about.Get().Contact;
        return Ok(new SiteSettingsContent(
            Pick(configured.ShowroomAddress, contact.Address),
            Pick(configured.Phone, contact.Phone),
            Pick(configured.Email, contact.Email),
            Pick(configured.ShowroomHours, contact.Hours)));
    }

    [HttpGet("shipping-pickup")]
    [ProducesResponseType<ShippingPickupLocation>(StatusCodes.Status200OK)]
    public ActionResult<ShippingPickupLocation> GetShippingPickup()
    {
        var location = shipping.Value;
        return Ok(new ShippingPickupLocation(location.PickupAddress, location.PickupLatitude, location.PickupLongitude));
    }

    private static string Pick(string? value, string fallback) => string.IsNullOrWhiteSpace(value) ? fallback : value;
}
