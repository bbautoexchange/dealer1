using RetroDrive.Api.Models;

namespace RetroDrive.Api.Services;

public sealed class VehicleCatalog
{
    private readonly IReadOnlyList<Vehicle> vehicles =
    [
        new(
            "1967-ford-mustang-fastback",
            1967, "Ford", "Mustang Fastback", 84900m, null, 52318, "7R02C184928", "Highland Green", "Black vinyl",
            "289 V8", "271 hp", "4-speed manual", "Fastback", "Scottsdale, Arizona", "RD-6701", 89500m,
            "An authentically styled fastback with a documented restoration, period-correct details, and the confident road manners that made the first-generation Mustang an American icon.",
            ["Documented restoration", "Factory-style interior", "Period-correct 4-speed", "Nationwide enclosed delivery"],
            ["retrodive/mustang-1967/front", "retrodive/mustang-1967/profile", "retrodive/mustang-1967/interior"]),
        new(
            "1972-chevrolet-corvette-stingray",
            1972, "Chevrolet", "Corvette Stingray", 58900m, null, 61204, "1Z37K2S500001", "Ontario Orange", "Black leather",
            "350 V8", "200 hp", "Turbo-Hydramatic automatic", "Coupe", "Nashville, Tennessee", "RD-7204", 62900m,
            "A bright, numbers-matching C3 coupe with removable T-tops, a rich black interior, and a well-kept presentation ready for weekend drives or a growing collection.",
            ["Numbers-matching drivetrain", "Removable T-tops", "Documented service history", "Clear title"],
            ["retrodive/corvette-1972/front", "retrodive/corvette-1972/profile", "retrodive/corvette-1972/interior"]),
        new(
            "1965-porsche-356c-coupe",
            1965, "Porsche", "356C Coupe", 119500m, null, 48766, "221718", "Signal Red", "Tan leather",
            "1600 cc flat-four", "75 hp", "4-speed manual", "Coupe", "Monterey, California", "RD-6508", 126000m,
            "A late-production 356C finished in a timeless color combination. Carefully preserved character, sharp panel fit, and an inviting analog driving experience.",
            ["Late-production 356C", "Four-wheel disc brakes", "Collector-grade presentation", "Inspection report available"],
            ["retrodive/porsche-356c/front", "retrodive/porsche-356c/profile", "retrodive/porsche-356c/interior"])
    ];

    public IReadOnlyList<Vehicle> GetAll() => vehicles;

    public Vehicle? FindBySlug(string slug) => vehicles.FirstOrDefault(vehicle =>
        string.Equals(vehicle.Slug, slug, StringComparison.OrdinalIgnoreCase));
}
