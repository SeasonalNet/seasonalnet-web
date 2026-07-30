# @seasonalnet/docs

Dedicated documentation frontend for SeasonalNet.

## Current state

- `apps/docs` is a standalone Next.js workspace in the monorepo.
- Fumadocs renders the public documentation under `/docs`.
- The app root `/` redirects directly to `/docs`; there is no separate custom docs lander.
- The public docs tree is organized around top-level About, Topology, Projects, and Policies sections.
- Legacy `/docs/network/*` routes redirect to `/docs/topology/*` for compatibility.
- The app is wrapped in the shared SeasonalNet shell.
- Public publishing policy is explicit and enforced before synced docs are written.

## Policy

Publish rules live in:

- `apps/docs/PUBLISHING.md`
- `apps/docs/scripts/public-docs-policy.mjs`

Only explicitly allowlisted content from `seasonalnet-docs` may be synced into this app.
`VMs/` and any other non-allowlisted paths are excluded from publication.

## Sync commands

Sync from a sibling checkout at `/opt/git-staging/seasonalnet-docs`:

```bash
pnpm --filter @seasonalnet/docs docs:sync
```

Build with sync first:

```bash
pnpm --filter @seasonalnet/docs build:public
```

Override the source path when needed:

```bash
SEASONALNET_DOCS_SOURCE=/path/to/seasonalnet-docs pnpm --filter @seasonalnet/docs docs:sync
```
