namespace RetroDrive.Api.Models;

public sealed record AboutContent(
    string Eyebrow,
    string Title,
    string Intro,
    AboutStory Story,
    AboutContact Contact,
    IReadOnlyList<AboutStat> Stats);

public sealed record AboutStory(string Title, IReadOnlyList<string> Paragraphs, string ImageCaption, string LicenseTitle, string LicenseDetail);

public sealed record AboutContact(
    string Title,
    string AddressLabel,
    string Address,
    string PhoneLabel,
    string Phone,
    string PhoneDetail,
    string EmailLabel,
    string Email,
    string EmailDetail,
    string HoursLabel,
    string Hours);

public sealed record AboutStat(string Value, string Label, string Detail);
