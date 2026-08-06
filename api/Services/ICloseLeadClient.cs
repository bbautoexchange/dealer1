using RetroDrive.Api.Contracts;
using RetroDrive.Api.Models;

namespace RetroDrive.Api.Services;

public interface ICloseLeadClient
{
    Task<bool> CreateLeadAsync(CreateInquiryRequest inquiry, Vehicle vehicle, CancellationToken cancellationToken);
    Task<bool> CreateLeadAsync(WebsiteLead lead, CancellationToken cancellationToken);
}
