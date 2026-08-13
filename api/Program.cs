using RetroDrive.Api.Options;
using RetroDrive.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.Configure<CloseOptions>(builder.Configuration.GetSection(CloseOptions.SectionName));
builder.Services.Configure<CloudinaryOptions>(builder.Configuration.GetSection(CloudinaryOptions.SectionName));
builder.Services.Configure<AdminOptions>(builder.Configuration.GetSection(AdminOptions.SectionName));
builder.Services.Configure<TrustedNetworkOptions>(builder.Configuration.GetSection(TrustedNetworkOptions.SectionName));
builder.Services.Configure<ShippingOptions>(builder.Configuration.GetSection(ShippingOptions.SectionName));
builder.Services.Configure<AboutOptions>(builder.Configuration.GetSection(AboutOptions.SectionName));
builder.Services.Configure<SiteSettingsOptions>(builder.Configuration.GetSection(SiteSettingsOptions.SectionName));
builder.Services.Configure<MetaConversionsOptions>(builder.Configuration.GetSection(MetaConversionsOptions.SectionName));
builder.Services.Configure<InquiryCooldownOptions>(builder.Configuration.GetSection(InquiryCooldownOptions.SectionName));
builder.Services.AddSingleton<VehicleCatalog>();
builder.Services.AddSingleton<InventoryStore>();
builder.Services.AddSingleton<VehicleInquiryCooldown>();
builder.Services.AddSingleton<AdminSessionService>();
builder.Services.AddSingleton<CloudinaryUrlBuilder>();
builder.Services.AddSingleton<TrustedNetworkContentProvider>();
builder.Services.AddSingleton<AboutContentProvider>();
builder.Services.AddHttpClient<ICloseLeadClient, CloseLeadClient>(client =>
{
    client.BaseAddress = new Uri("https://api.close.com/api/v1/");
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<IMetaConversionsClient, MetaConversionsClient>(client =>
{
    client.BaseAddress = new Uri("https://graph.facebook.com/");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddCors(options =>
{
    options.AddPolicy("Storefront", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? ["http://localhost:5173", "https://localhost:5173"];
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

await app.Services.GetRequiredService<InventoryStore>().InitializeAsync();
await app.Services.GetRequiredService<VehicleInquiryCooldown>().InitializeAsync();

app.UseExceptionHandler();
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseCors("Storefront");
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapFallbackToFile("index.html");

app.Run();
