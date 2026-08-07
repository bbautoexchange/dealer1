using System.ComponentModel.DataAnnotations;

namespace RetroDrive.Api.Contracts;

public sealed class BulkImportVehiclesRequest
{
    [Required, MinLength(1), MaxLength(500)]
    public IReadOnlyList<CreateAdminVehicleRequest> Vehicles { get; init; } = [];
}
