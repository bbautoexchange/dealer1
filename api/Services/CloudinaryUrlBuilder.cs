using Microsoft.Extensions.Options;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class CloudinaryUrlBuilder(IOptions<CloudinaryOptions> options)
{
    public string BuildImageUrl(string publicId, int width = 1600)
    {
        var cloudName = options.Value.CloudName.Trim();

        if (string.IsNullOrWhiteSpace(cloudName))
        {
            return publicId.Contains("corvette", StringComparison.OrdinalIgnoreCase)
                ? "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=85"
                : publicId.Contains("porsche", StringComparison.OrdinalIgnoreCase)
                    ? "https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1600&q=85"
                    : "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=85";
        }

        var encodedPublicId = string.Join('/', publicId.Split('/').Select(Uri.EscapeDataString));
        return $"https://res.cloudinary.com/{Uri.EscapeDataString(cloudName)}/image/upload/f_auto,q_auto,w_{width}/{encodedPublicId}";
    }
}
