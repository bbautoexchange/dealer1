using System.Text.Json;
using Microsoft.Extensions.Options;
using RetroDrive.Api.Models;
using RetroDrive.Api.Options;

namespace RetroDrive.Api.Services;

public sealed class AboutContentProvider(
    IOptions<AboutOptions> options,
    ILogger<AboutContentProvider> logger)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string? contentJson = options.Value.ContentJson;

    public AboutContent Get()
    {
        if (string.IsNullOrWhiteSpace(contentJson)) return Default;

        try
        {
            var configured = JsonSerializer.Deserialize<AboutContent>(contentJson, JsonOptions);
            if (configured is not null) return MergeWithDefaults(configured);
            logger.LogWarning("About:ContentJson is empty. Default about content is being used.");
        }
        catch (JsonException exception)
        {
            logger.LogWarning(exception, "About:ContentJson is not valid JSON. Default about content is being used.");
        }

        return Default;
    }

    private static AboutContent MergeWithDefaults(AboutContent configured)
    {
        var defaults = Default;
        var story = configured.Story;
        var contact = configured.Contact;

        return new AboutContent(
            Pick(configured.Eyebrow, defaults.Eyebrow),
            Pick(configured.Title, defaults.Title),
            Pick(configured.Intro, defaults.Intro),
            new AboutStory(
                Pick(story?.Title, defaults.Story.Title),
                story?.Paragraphs is { Count: > 0 } ? story.Paragraphs : defaults.Story.Paragraphs,
                Pick(story?.ImageCaption, defaults.Story.ImageCaption),
                Pick(story?.LicenseTitle, defaults.Story.LicenseTitle),
                Pick(story?.LicenseDetail, defaults.Story.LicenseDetail)),
            new AboutContact(
                Pick(contact?.Title, defaults.Contact.Title),
                Pick(contact?.AddressLabel, defaults.Contact.AddressLabel),
                Pick(contact?.Address, defaults.Contact.Address),
                Pick(contact?.PhoneLabel, defaults.Contact.PhoneLabel),
                Pick(contact?.Phone, defaults.Contact.Phone),
                Pick(contact?.PhoneDetail, defaults.Contact.PhoneDetail),
                Pick(contact?.EmailLabel, defaults.Contact.EmailLabel),
                Pick(contact?.Email, defaults.Contact.Email),
                Pick(contact?.EmailDetail, defaults.Contact.EmailDetail),
                Pick(contact?.HoursLabel, defaults.Contact.HoursLabel),
                Pick(contact?.Hours, defaults.Contact.Hours)),
            configured.Stats is { Count: > 0 } ? configured.Stats : defaults.Stats);
    }

    private static string Pick(string? value, string fallback) => string.IsNullOrWhiteSpace(value) ? fallback : value;

    private static AboutContent Default => new(
        "Who we are",
        "ABOUT RETRODRIVE USA",
        "A classic-car buying experience built around clear information, responsive communication, and nationwide coordination.",
        new AboutStory(
            "Our Story",
            [
                "RetroDrive USA is built for people who care about the character, history, and driving feel that make a classic vehicle memorable.",
                "We focus on clear vehicle information, direct answers, and a purchase process that works whether you are nearby or across the country.",
                "Each conversation starts with the details that matter to you: the vehicle, its condition, your timeline, and the next step."
            ],
            "The RetroDrive standard: clear details and a thoughtful buying experience.",
            "Classic vehicle specialists",
            "Vehicle, documentation, and delivery details are reviewed with you before the next step."),
        new AboutContact(
            "Contact & Location",
            "Showroom address",
            "Contact RetroDrive for showroom details and appointments.",
            "Phone",
            "Call us to discuss a vehicle",
            "Appointments and calls are coordinated directly with the RetroDrive team.",
            "Email",
            "info@retrodriveusa.com",
            "We respond as soon as possible during business hours.",
            "Business hours",
            "By appointment · Monday–Saturday"),
        [
            new AboutStat("Collector focused", "Vehicle selection", "Classic, muscle & performance"),
            new AboutStat("Nationwide", "Delivery coordination", "Across the United States"),
            new AboutStat("Direct", "Specialist support", "Clear answers at every step"),
            new AboutStat("Documented", "Vehicle details", "History and condition context")
        ]);
}
