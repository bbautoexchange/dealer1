using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Contracts;
using RetroDrive.Api.Models;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class CloseLeadClient(
    HttpClient httpClient,
    IOptions<CloseOptions> options,
    ILogger<CloseLeadClient> logger) : ICloseLeadClient
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public Task<bool> CreateLeadAsync(CreateInquiryRequest inquiry, Vehicle vehicle, CancellationToken cancellationToken) =>
        CreateLeadAsync(
            new WebsiteLead(
                $"Vehicle inquiry - {vehicle.Year} {vehicle.Make} {vehicle.Model}",
                inquiry.FirstName,
                inquiry.LastName,
                inquiry.Email,
                inquiry.Phone,
                BuildVehicleDescription(inquiry, vehicle),
                inquiry.PageUrl,
                "Website",
                $"{vehicle.Year} {vehicle.Make} {vehicle.Model}",
                vehicle.Vin,
                vehicle.PriceText ?? $"${vehicle.Price:N0}"),
            cancellationToken);

    public async Task<bool> CreateLeadAsync(WebsiteLead lead, CancellationToken cancellationToken)
    {
        var settings = options.Value;
        if (string.IsNullOrWhiteSpace(settings.ApiKey))
        {
            logger.LogError("Close CRM is not configured. A website lead was rejected to prevent data loss.");
            throw new CloseCrmNotConfiguredException();
        }

        var customFields = new Dictionary<string, object>();
        AddCustomField(customFields, settings, "Source", lead.Source);
        AddCustomField(customFields, settings, "PageUrl", lead.PageUrl ?? string.Empty);
        AddCustomField(customFields, settings, "Vehicle", lead.Vehicle ?? string.Empty);
        AddCustomField(customFields, settings, "Vin", lead.Vin ?? string.Empty);
        AddCustomField(customFields, settings, "Price", lead.Price ?? string.Empty);

        var contacts = new Dictionary<string, object>
        {
            ["name"] = $"{lead.FirstName.Trim()} {lead.LastName.Trim()}",
            ["emails"] = new[] { new { email = lead.Email.Trim(), type = "office" } }
        };

        var normalizedPhone = NormalizePhone(lead.Phone);
        if (!string.IsNullOrWhiteSpace(normalizedPhone))
        {
            contacts["phones"] = new[] { new { phone = normalizedPhone, type = "mobile" } };
        }

        var payload = new Dictionary<string, object>
        {
            ["name"] = lead.Name.Trim(),
            ["description"] = lead.Description.Trim(),
            ["contacts"] = new[] { contacts }
        };

        if (!string.IsNullOrWhiteSpace(settings.StatusId))
        {
            payload["status_id"] = settings.StatusId.Trim();
        }

        foreach (var customField in customFields)
        {
            payload[customField.Key] = customField.Value;
        }

        using var request = new HttpRequestMessage(HttpMethod.Post, "lead/");
        request.Headers.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.ASCII.GetBytes($"{settings.ApiKey}:")));
        var serializedPayload = JsonSerializer.Serialize(payload, JsonOptions);
        request.Content = new StringContent(serializedPayload, Encoding.UTF8, "application/json");
        logger.LogInformation(
            "Sending Close CRM lead {LeadName} as {PayloadLength} bytes of JSON.",
            lead.Name,
            Encoding.UTF8.GetByteCount(serializedPayload));

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
        {
            logger.LogInformation("Close CRM lead created for {LeadName}.", lead.Name);
            return true;
        }

        var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
        var closeMessage = SummarizeError(errorBody);
        logger.LogError(
            "Close CRM returned status code {StatusCode} for {LeadName}. Close message: {CloseMessage}",
            (int)response.StatusCode,
            lead.Name,
            closeMessage);
        throw new HttpRequestException($"Close CRM returned status code {(int)response.StatusCode}. Close message: {closeMessage}");
    }

    private static void AddCustomField(Dictionary<string, object> values, CloseOptions settings, string name, string value)
    {
        if (settings.CustomFieldIds.TryGetValue(name, out var id) && !string.IsNullOrWhiteSpace(id))
        {
            values[$"custom.{id.Trim()}"] = value;
        }
    }

    private static string? NormalizePhone(string? phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return null;

        var trimmed = phone.Trim();
        var digits = new string(trimmed.Where(char.IsDigit).ToArray());
        if (digits.Length == 10) return $"+1{digits}";
        if (digits.Length == 11 && digits.StartsWith('1')) return $"+{digits}";
        return trimmed;
    }

    private static string SummarizeError(string responseBody)
    {
        if (string.IsNullOrWhiteSpace(responseBody)) return "No error details were returned.";

        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;
            foreach (var propertyName in new[] { "error", "message", "detail" })
            {
                if (root.TryGetProperty(propertyName, out var value) && value.ValueKind == JsonValueKind.String)
                {
                    return Limit(value.GetString());
                }
            }
        }
        catch (JsonException)
        {
            // Close can return a non-JSON error response; log a small safe excerpt below.
        }

        return Limit(responseBody);
    }

    private static string Limit(string? value) => string.IsNullOrWhiteSpace(value)
        ? "No error details were returned."
        : value.Trim()[..Math.Min(700, value.Trim().Length)];

    private static string BuildVehicleDescription(CreateInquiryRequest inquiry, Vehicle vehicle) =>
        $"Website vehicle inquiry\n\nVehicle: {vehicle.Year} {vehicle.Make} {vehicle.Model}\nVIN: {vehicle.Vin}\nPrice: {vehicle.PriceText ?? $"${vehicle.Price:N0}"}\nSource: Website\nPage: {inquiry.PageUrl ?? "Not provided"}\n\nMessage:\n{(string.IsNullOrWhiteSpace(inquiry.Message) ? "No message provided." : inquiry.Message.Trim())}";
}
