# @seasonalnet/docs

Dedicated documentation frontend for SeasonalNet.

## Current state

- `apps/docs` is a standalone Next.js workspace in the monorepo.
- Fumadocs renders local content under `/docs`.
- The app is wrapped in the shared SeasonalNet shell.
- Public publishing policy is defined before repo sync is enabled.

## Policy

Publish rules live in:

- `apps/docs/PUBLISHING.md`
- `apps/docs/scripts/public-docs-policy.mjs`

Only explicitly allowlisted content from `seasonalnet-docs` may be synced into this app.
`VMs/` and any other non-allowlisted paths are excluded from publication.

## Sync commands

Sync from a sibling checkout at `/opt/git-staging/seasonalnet-docs`:

```bash
npm run docs:sync --workspace @seasonalnet/docs
```

Build with sync first:

```bash
npm run build:public --workspace @seasonalnet/docs
```

Override the source path when needed:

```bash
SEASONALNET_DOCS_SOURCE=/path/to/seasonalnet-docs npm run docs:sync --workspace @seasonalnet/docs
```
