using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using RetroDrive.Api.Contracts;
using RetroDrive.Api.Models;
using RetroDrive.Api.Services;

namespace RetroDrive.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed partial class AdminController(
    AdminSessionService sessions,
    InventoryStore inventory,
    CloudinaryUrlBuilder images,
    IWebHostEnvironment environment,
    ILogger<AdminController> logger) : ControllerBase
{
    [HttpPost("auth/login")]
    [ProducesResponseType<AdminSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status503ServiceUnavailable)]
    public ActionResult<AdminSessionResponse> Login([FromBody] AdminLoginRequest request)
    {
        if (!sessions.IsConfigured)
        {
            logger.LogWarning("Admin sign-in was requested before Admin:Password and Admin:SessionSecret were configured.");
            return Problem(statusCode: StatusCodes.Status503ServiceUnavailable, title: "Admin access has not been configured.");
        }

        if (!sessions.VerifyPassword(request.Password))
        {
            return Unauthorized(new ProblemDetails { Title = "Invalid password." });
        }

        var now = DateTimeOffset.UtcNow;
        Response.Cookies.Append(AdminSessionService.CookieName, sessions.CreateToken(now), new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Secure = !environment.IsDevelopment(),
            Expires = now.Add(sessions.Lifetime),
            Path = "/"
        });
        return Ok(new AdminSessionResponse(true));
    }

    [HttpPost("auth/logout")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AdminSessionService.CookieName, new CookieOptions
        {
            HttpOnly = true,
            IsEssential = true,
            SameSite = SameSiteMode.Lax,
            Secure = !environment.IsDevelopment(),
            Path = "/"
        });
        return NoContent();
    }

    [HttpGet("auth/me")]
    [ProducesResponseType<AdminSessionResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<AdminSessionResponse>(StatusCodes.Status401Unauthorized)]
    public ActionResult<AdminSessionResponse> Me() =>
        sessions.IsValid(Request.Cookies[AdminSessionService.CookieName], DateTimeOffset.UtcNow)
            ? Ok(new AdminSessionResponse(true))
            : Unauthorized(new AdminSessionResponse(false));

    [HttpGet("vehicles")]
    [ProducesResponseType<IReadOnlyList<AdminVehicleResponse>>(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IReadOnlyList<AdminVehicleResponse>>> GetVehicles(CancellationToken cancellationToken)
    {
        if (!IsAuthorized()) return Unauthorized();

        var vehicles = (await inventory.GetAllAsync(cancellationToken)).Select(ToResponse).ToList();
        return Ok(vehicles);
    }

    [HttpPost("vehicles")]
    [ProducesResponseType<AdminVehicleResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminVehicleResponse>> CreateVehicle(
        [FromBody] CreateAdminVehicleRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized()) return Unauthorized();

        var vehicle = ValidateAndCreateVehicle(request);
        if (!ModelState.IsValid || vehicle is null) return ValidationProblem(ModelState);

        try
        {
            var created = await inventory.CreateAsync(vehicle, request.Published, cancellationToken);
            var response = ToResponse(created);
            return Created($"/api/admin/vehicles/{created.Id}", response);
        }
        catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
        {
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "This vehicle URL already exists.", detail: "Choose a different URL slug or adjust the model name.");
        }
    }

    [HttpPost("vehicles/import")]
    [ProducesResponseType<IReadOnlyList<AdminVehicleResponse>>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<IReadOnlyList<AdminVehicleResponse>>> ImportVehicles(
        [FromBody] BulkImportVehiclesRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized()) return Unauthorized();
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var vehicles = new List<(Vehicle Vehicle, bool Published)>(request.Vehicles.Count);
        foreach (var requestVehicle in request.Vehicles)
        {
            var vehicle = ValidateAndCreateVehicle(requestVehicle);
            if (vehicle is not null) vehicles.Add((vehicle, requestVehicle.Published));
        }

        if (!ModelState.IsValid || vehicles.Count != request.Vehicles.Count) return ValidationProblem(ModelState);

        var duplicateSlug = vehicles
            .GroupBy(item => item.Vehicle.Slug, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1)?.Key;
        if (duplicateSlug is not null)
        {
            ModelState.AddModelError(nameof(request.Vehicles), $"The import contains the duplicate vehicle URL '{duplicateSlug}'.");
            return ValidationProblem(ModelState);
        }

        try
        {
            var created = await inventory.CreateManyAsync(vehicles, cancellationToken);
            return StatusCode(StatusCodes.Status201Created, created.Select(ToResponse).ToList());
        }
        catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
        {
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "One or more vehicle URLs already exist.", detail: "Adjust duplicate URL slugs, then import the file again. No vehicles were added.");
        }
    }

    [HttpPatch("vehicles/{id:long}/publication")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePublication(long id, [FromBody] UpdatePublicationRequest request, CancellationToken cancellationToken)
    {
        if (!IsAuthorized()) return Unauthorized();
        return await inventory.SetPublishedAsync(id, request.Published, cancellationToken) ? NoContent() : NotFound();
    }

    [HttpPut("vehicles/{id:long}")]
    [ProducesResponseType<AdminVehicleResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<AdminVehicleResponse>> UpdateVehicle(
        long id,
        [FromBody] CreateAdminVehicleRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsAuthorized()) return Unauthorized();

        var vehicle = ValidateAndCreateVehicle(request);
        if (!ModelState.IsValid || vehicle is null) return ValidationProblem(ModelState);

        try
        {
            var updated = await inventory.UpdateAsync(id, vehicle, request.Published, cancellationToken);
            return updated is null ? NotFound() : Ok(ToResponse(updated));
        }
        catch (SqliteException exception) when (exception.SqliteErrorCode == 19)
        {
            return Problem(statusCode: StatusCodes.Status409Conflict, title: "This vehicle URL already exists.", detail: "Choose a different URL slug or adjust the model name.");
        }
    }

    [HttpDelete("vehicles/{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteVehicle(long id, CancellationToken cancellationToken)
    {
        if (!IsAuthorized()) return Unauthorized();
        return await inventory.DeleteAsync(id, cancellationToken) ? NoContent() : NotFound();
    }

    private bool IsAuthorized() => sessions.IsValid(Request.Cookies[AdminSessionService.CookieName], DateTimeOffset.UtcNow);

    private Vehicle? ValidateAndCreateVehicle(CreateAdminVehicleRequest request)
    {
        if (request.Year > DateTime.UtcNow.Year + 1)
        {
            ModelState.AddModelError(nameof(request.Year), "Enter a valid model year.");
        }

        var required = new Dictionary<string, string?>
        {
            [nameof(request.Make)] = request.Make,
            [nameof(request.Model)] = request.Model,
            [nameof(request.Description)] = request.Description
        };
        foreach (var (field, value) in required.Where(pair => string.IsNullOrWhiteSpace(pair.Value)))
        {
            ModelState.AddModelError(field, "This field is required.");
        }

        var features = NormalizeList(request.Features, 140);
        var photos = NormalizeList(request.PhotoPublicIds, 240);
        if (photos.Count == 0)
        {
            ModelState.AddModelError(nameof(request.PhotoPublicIds), "Add at least one Cloudinary public ID.");
        }

        if (!ModelState.IsValid) return null;

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? Slugify($"{request.Year}-{request.Make}-{request.Model}")
            : Slugify(request.Slug);
        if (string.IsNullOrWhiteSpace(slug))
        {
            ModelState.AddModelError(nameof(request.Slug), "Enter a valid URL slug.");
            return null;
        }

        return new Vehicle(
            slug,
            request.Year,
            request.Make.Trim(),
            request.Model.Trim(),
            request.Price,
            request.PriceText.Trim(),
            request.Mileage,
            request.Vin.Trim(),
            request.ExteriorColor.Trim(),
            request.InteriorColor.Trim(),
            request.Engine.Trim(),
            request.Horsepower.Trim(),
            request.Transmission.Trim(),
            request.BodyStyle.Trim(),
            request.Location.Trim(),
            request.StockNumber.Trim(),
            request.Msrp,
            request.Description.Trim(),
            features,
            photos);
    }

    private AdminVehicleResponse ToResponse(InventoryVehicle item)
    {
        var vehicle = item.Vehicle;
        return new AdminVehicleResponse(
            item.Id,
            item.Published,
            item.CreatedAt,
            vehicle.Slug,
            vehicle.Year,
            vehicle.Make,
            vehicle.Model,
            vehicle.Price,
            vehicle.PriceText,
            vehicle.Msrp,
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
            vehicle.Description,
            vehicle.Features,
            vehicle.PhotoPublicIds,
            vehicle.PhotoPublicIds.Select(photo => images.BuildImageUrl(photo)).ToList());
    }

    private static List<string> NormalizeList(IReadOnlyList<string>? values, int maxLength) => values?
        .Select(value => value?.Trim() ?? string.Empty)
        .Where(value => value.Length > 0)
        .Where(value => value.Length <= maxLength)
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList() ?? [];

    private static string Slugify(string value)
    {
        var normalized = SlugCharacters().Replace(value.Trim().ToLowerInvariant(), "-").Trim('-');
        return normalized[..Math.Min(160, normalized.Length)];
    }

    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex SlugCharacters();
}
