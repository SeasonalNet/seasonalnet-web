# AGENTS.md

## Purpose
This repository contains the SeasonalNet frontend monorepo.

## Structure
- `apps/*` contains deployable frontend apps.
- `packages/*` contains shared code used by multiple apps.
- Shared frontend shell/layout code must live in `packages/shell`, not be copied between apps.

## Rules
- Use canonical app directories only. Do not duplicate short-name deployment symlink aliases in source layout.
- Do not commit `node_modules`, build output, secrets, or local `.env` files.
- Preserve the SeasonalNet front-door shell style:
  - black-and-white only
  - standard site header and footer
  - modular card-based layout
  - no sidebar in non-docs apps unless explicitly required
  - SoA grouping where applicable
- Keep copy concise and operational.
- Prefer refactors that reduce shell duplication across apps.
- Docs content belongs in `seasonalnet-docs`, not here, except for docs-app glue/configuration.
