# syntax=docker/dockerfile:1

FROM node:22-alpine AS web-build
WORKDIR /src/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS api-build
WORKDIR /src
COPY api/RetroDrive.Api.csproj api/
RUN dotnet restore api/RetroDrive.Api.csproj
COPY api/ api/
RUN dotnet publish api/RetroDrive.Api.csproj --configuration Release --output /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=api-build /app/publish ./
COPY --from=web-build /src/web/dist ./wwwroot
ENV ASPNETCORE_ENVIRONMENT=Production
ENV ASPNETCORE_URLS=http://+:10000
EXPOSE 10000
ENTRYPOINT ["dotnet", "RetroDrive.Api.dll"]
