# AGENTS.md

## Purpose

This app is the dedicated documentation frontend for SeasonalNet.

It will host public documentation under `apps/docs` and is expected to render structured docs content rather than raw markdown source.

## Hard rules

1. Keep this app as a real standalone workspace.
   - Do not fold docs into `apps/www`.
   - Do not treat docs as a special route inside another app.

2. Use the shared shell.
   - Reuse `@seasonalnet/shell` header/footer/theme components.
   - Do not fork shared shell UI locally unless a docs-specific adapter is required.

3. Keep first-pass scaffolding small.
   - Prove the app builds before adding Fumadocs.
   - Prove local docs rendering before adding sync from `seasonalnet-docs`.

4. Do not introduce runtime repo fetching.
   - Docs content sync must happen at build/deploy time.

5. Enforce the public publishing policy.
   - Only explicitly allowlisted files from `seasonalnet-docs` may be published.
   - `VMs/` and any non-allowlisted paths must never be synced into this app.

6. Keep generated sync output deterministic.
   - Generated content may overwrite managed docs pages, but only for files declared in the policy.
   - Do not turn a whole repo copy into the content tree.

5. Preserve SeasonalNet visual identity.
   - black-and-white only
   - standard header/footer
   - concise copy
   - docs may have a sidebar later because docs are the explicit exception

## Current phase

This app already has:

- app workspace structure
- Fumadocs rendering with local seed content
- shared shell integration
- a defined public publishing policy
- an allowlisted Policies section sourced from `seasonalnet-docs`

The app now has a build/deploy-time sync script for `seasonalnet-docs`, but live deployment wiring remains separate.
