using Microsoft.AspNetCore.Http;
using RetroDrive.Api.Models;

namespace RetroDrive.Api.Services;

public interface IMetaConversionsClient
{
    Task TrackLeadAsync(WebsiteLead lead, string? eventId, HttpRequest request, CancellationToken cancellationToken);
}
