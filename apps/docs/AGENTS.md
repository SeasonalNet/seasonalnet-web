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
   - Docs content sync, when added later, must happen at build/deploy time.

5. Preserve SeasonalNet visual identity.
   - black-and-white only
   - standard header/footer
   - concise copy
   - docs may have a sidebar later because docs are the explicit exception

## Current phase

This scaffold phase should only establish:

- app workspace structure
- shared shell integration
- placeholder landing page
- announcements API parity with other apps

It should not yet add:

- Fumadocs
- docs repo sync
- live deployment wiring
