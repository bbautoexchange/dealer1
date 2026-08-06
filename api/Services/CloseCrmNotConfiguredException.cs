namespace RetroDrive.Api.Services;

public sealed class CloseCrmNotConfiguredException : Exception
{
    public CloseCrmNotConfiguredException()
        : base("Close CRM is not configured.")
    {
    }
}
