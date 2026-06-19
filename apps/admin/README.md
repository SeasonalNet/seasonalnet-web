# admin-spa

SeasonalNet admin front door scaffold.

Built by cloning the shared SeasonalNet site shell and adapting it into a centralized,
sidebar-driven control plane.

## Design rules locked in

- standard SeasonalNet site-header + site-footer
- black/white only
- sidebar module switcher
- one focused panel per selected managed system
- SoA grouping inside every module card:
  - Status
  - Operations
  - Administration
- short summaries, not statement soup
- server-side proxy/BFF pattern for backend APIs
- backend validation and idempotent write paths first

## Live modules

- SeasonalWeather
- SeasonalProvisioning

## Planned follow-ons

- SeasonalPBX
- SeasonalRadio


## SeasonalWeather backend wiring

The admin app server-side API routes proxy SeasonalWeather control calls. Configure the
admin app runtime with a reachable SeasonalWeather HTTP base URL and the matching API
tokens:

```env
SEASONALWEATHER_API_BASE=http://wx.lan.seasonalnet.org
SEASONALWEATHER_READ_TOKEN=...
SEASONALWEATHER_CONTROL_TOKEN=...
SEASONALWEATHER_ORIGINATE_TOKEN=...
SEASONALWEATHER_INSERTS_TOKEN=... # optional; falls back to CONTROL token
SEASONALWEATHER_CONFIG_TOKEN=... # optional; falls back to CONTROL token
```

Do not rely on `127.0.0.1` unless SeasonalWeather is running on the same host as the
admin Next.js process. For the normal SeasonalNet split-host deployment, point this at
the SeasonalWX nginx proxy or another internal reverse proxy that can reach the local
SeasonalWeather daemon.

SeasonalWeather now publishes OpenAPI 3.1 at `/openapi.json` and returns RFC 9457 Problem Details for API errors (`application/problem+json`). The admin BFF accepts that media type from the upstream API and maps upstream problem metadata into its own Problem Details response for browser callers.

Cycle insert controls use the authenticated `/v1/inserts/*` SeasonalWeather API. The admin UI can schedule bounded text inserts, schedule previously uploaded WAV assets as audio inserts, list active/inactive inserts, and cancel active inserts without using the manual alert origination path.
