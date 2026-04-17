# seasonalnet-web

SeasonalNet frontend monorepo for the public site family and related web front ends.

This repository is the source-of-truth workspace for the Next.js applications that back the SeasonalNet web stack. It exists to consolidate frontend code that had previously lived as separately deployed SPA trees, make shared shell and UI extraction practical, and give the project a clean place to evolve the public and operator-facing web surfaces together.

## What this repository is

This repository is a **development and staging monorepo**, not the currently served document root on SeasonalWeb.

At the time of initialization, the live web roots still exist separately under `/opt/seasonalnet/` as deployment directories such as:

- `www-spa`
- `radio-spa`
- `pbx-spa`
- `prov-spa`
- `admin-spa`
- legacy or alternate deployment-prefixed variants already present on the host

The canonical source tree for ongoing work should live here under `/opt/git-staging/seasonalnet-web` (or an equivalent clone elsewhere). Building in this repository is primarily for:

- compile validation
- linting and dependency sanity checks
- local or staging development
- preparing explicit deployment cutovers
- shared package extraction and refactors

A successful build here does **not** by itself deploy or replace the live sites. Promotion to the live `/opt/seasonalnet/*` trees is a separate operational step.

## Repository goals

- Keep all SeasonalNet frontend apps in one workspace.
- Reduce shell and layout duplication across apps.
- Establish a canonical place for shared frontend code.
- Make cross-app refactors practical.
- Preserve the existing SeasonalNet front-door presentation while the internals are modernized.

## Monorepo layout

```text
seasonalnet-web/
├── AGENTS.md
├── README.md
├── package.json
├── package-lock.json
├── apps/
│   ├── admin/
│   ├── agent/
│   ├── pbx/
│   ├── prov/
│   ├── radio/
│   └── www/
└── packages/
    └── shell/
```

### `apps/`
Deployable frontend applications.

- `apps/www` — main public SeasonalNet web front door
- `apps/radio` — SeasonalRadio web frontend
- `apps/pbx` — SeasonalPBX web frontend
- `apps/prov` — provisioning frontend
- `apps/admin` — centralized SeasonalNet admin front door / control-plane UI
- `apps/agent` — Seasonal Agent operator chat frontend over the local agent API

Each app is currently its own Next.js workspace package with its own local config and scripts.

### `packages/`
Shared code intended for reuse across multiple apps.

- `packages/shell` — shared SeasonalNet shell/layout/components package target

The package area is intentionally minimal right now. The repo was imported first so the live SPAs had a source-controlled home; extraction of duplicated shell code is expected to follow.

## Technology snapshot

Current workspace characteristics at import time:

- npm workspaces at the repository root
- Next.js 16 application packages
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-oriented component setup in the app workspaces
- Framer Motion and Lucide where used
- Leaflet present in the radio app
- NextAuth present in the admin app

The root `package.json` is intentionally small and currently defines workspace membership rather than a large orchestration layer.

## Working in this repository

Install dependencies at the repository root:

```bash
npm install
```

Run an individual app in development:

```bash
npm run dev --workspace @seasonalnet/www
npm run dev --workspace @seasonalnet/radio
npm run dev --workspace @seasonalnet/pbx
npm run dev --workspace @seasonalnet/prov
npm run dev --workspace @seasonalnet/admin
npm run dev --workspace @seasonalnet/agent
```

Build an individual app:

```bash
npm run build --workspace @seasonalnet/www
npm run build --workspace @seasonalnet/radio
npm run build --workspace @seasonalnet/pbx
npm run build --workspace @seasonalnet/prov
npm run build --workspace @seasonalnet/admin
npm run build --workspace @seasonalnet/agent
```

Lint an individual app:

```bash
npm run lint --workspace @seasonalnet/www
npm run lint --workspace @seasonalnet/radio
npm run lint --workspace @seasonalnet/pbx
npm run lint --workspace @seasonalnet/prov
npm run lint --workspace @seasonalnet/admin
npm run lint --workspace @seasonalnet/agent
```

Build all workspaces from the root when needed:

```bash
npm run build --workspaces
```

Lint all workspaces from the root when needed:

```bash
npm run lint --workspaces
```

## Expected workflow

1. Make changes in this repository, not in the live deployment directories.
2. Validate the affected app locally or on the staging host.
3. Keep shared shell/layout work moving toward `packages/shell` instead of copying between apps.
4. Commit reviewed changes to Forgejo from this canonical monorepo.
5. Promote to the live `/opt/seasonalnet/*` deployment trees as an explicit deployment action.

## Design and UI conventions

SeasonalNet has a consistent front-door style that should remain recognizable across apps.

Core expectations:

- black-and-white visual system by default
- shared site header and site footer where applicable
- modular card-based layout
- concise operational copy
- avoid decorative clutter
- no sidebar in non-docs apps unless there is a clear product need
- prefer reusable shell patterns over one-off app-local clones

For admin and other operator surfaces, group actions by SoA where appropriate:

- Status
- Operations
- Administration

## Documentation boundaries

This repository is for frontend application code and the operational docs needed to work on that codebase.

Documentation **content** for the dedicated docs experience should live in the separate `seasonalnet-docs` repository. Only docs-app glue, frontend integration code, or monorepo-specific operational documentation belongs here.

## Repository hygiene

Do not commit:

- `node_modules`
- build output such as `.next/`
- local environment files
- secrets or tokens
- ad-hoc deployment snapshots
- short-name deployment alias directories copied in from `/opt/seasonalnet`

Keep the source layout canonical. The monorepo should reflect actual application and shared-package boundaries, not deployment shortcuts.

## Current state and near-term direction

This repository is still in an early consolidation phase.

Near-term priorities are expected to include:

- replacing placeholder app READMEs inherited from scaffolding
- extracting shared shell code into `packages/shell`
- reducing duplicated config where practical
- tightening root-level developer ergonomics over time
- documenting deployment and cutover flow once the monorepo becomes the normal operating path

## Commit guidance

Use conventional commits.

Examples:

- `feat: add shared site header package`
- `fix: align radio shell with canonical footer`
- `refactor: move card primitives into packages/shell`
- `docs: expand monorepo operating documentation`

## See also

- `AGENTS.md` for agent-focused repository rules and workflow constraints
- individual `apps/*/README.md` files for app-specific notes as they are expanded
