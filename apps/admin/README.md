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
