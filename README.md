# B & B Auto Exchange

Lead-first website for B & B Auto Exchange, focused exclusively on retro and classic vehicles across the United States.

## What is included in this first stage

- React + Vite storefront with a home page, inventory, vehicle detail pages, and an inquiry form.
- ASP.NET Core Web API with vehicle endpoints and server-side validation for inquiries.
- Close CRM adapter that creates a lead only from the server, keeping the Close key private.
- Cloudinary delivery URL adapter for optimized vehicle-gallery images.
- Public dealer workflows: searchable inventory, full vehicle pages, finance payment planning, delivery estimates, trade-in appraisals, VIP arrival alerts, and policy pages.
- A protected `/admin` workspace for adding vehicle listings, saving drafts, and publishing or unpublishing inventory.
- SQLite-backed inventory storage. The initial sample cars are seeded once; new records persist in `api/App_Data/retrodrive.db` (not committed to Git).

## Start locally

The web app and API run separately during development.

Prerequisites: Node.js 20+ and the .NET 9 SDK/runtime.

```powershell
cd api
$env:DOTNET_ROLL_FORWARD = "LatestMajor" # only if .NET 9 is not installed locally
dotnet run --launch-profile http
```

In a second terminal:

```powershell
cd web
npm.cmd install
npm.cmd run dev
```

Copy `api/appsettings.Development.example.json` to `api/appsettings.Development.json` and enter your Close and Admin values before testing real lead delivery or the admin workspace. Copy `.env.example` to `web/.env.local` if the API address differs from the default. The local defaults use `http://localhost:5141` for the API and `http://127.0.0.1:5173` for the website.

## Configuration notes

- Close CRM: set `Close:ApiKey` before exposing the inquiry form. The API rejects an inquiry when Close is unavailable or unconfigured, rather than silently losing a prospective buyer. Create optional custom fields in Close, then add their field IDs under `Close:CustomFieldIds`; the lead description always includes the vehicle details and message.
- Cloudinary: the app generates secure, optimized delivery URLs from `Cloudinary:CloudName`. Add a public ID for each photo to the vehicle record as inventory moves to a database.
- The API intentionally does not accept either provider credential from the browser.
- Admin: set a unique `Admin:Password` and a random `Admin:SessionSecret` of at least 32 characters. In production, provide both through environment variables (`Admin__Password`, `Admin__SessionSecret`) instead of a checked-in settings file. Go to `/admin` and sign in; image fields expect Cloudinary **public IDs**, one per line.
