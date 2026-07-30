# seasonalnet-web

SeasonalNet frontend monorepo for the public site family and related web front ends.

This repository is the source-of-truth workspace for the Next.js applications that back the SeasonalNet web stack. It consolidates frontend code that had previously lived as separately deployed SPA trees, keeps shared shell and UI code in one place, and gives the project a clean place to evolve the public, documentation, and operator-facing web surfaces together.

## What this repository is

This repository is a **development and staging monorepo**, not necessarily the currently served document root on SeasonalWeb.

The live web roots may still exist separately under `/opt/seasonalnet/` as deployment directories or short-path aliases such as:

- `www-spa`
- `radio-spa`
- `pbx-spa`
- `prov-spa`
- `admin-spa`
- `agent-spa`
- `docs-spa`
- legacy or alternate deployment-prefixed variants already present on the host

The canonical source tree for ongoing work should live here under `/opt/git-staging/seasonalnet-web` or an equivalent clone elsewhere. Building in this repository is primarily for:

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
- Keep the dedicated docs frontend wired to public documentation policy without storing the source docs repo here.
- Make cross-app refactors practical.
- Preserve the existing SeasonalNet front-door presentation while the internals are modernized.

## Monorepo layout

```text
seasonalnet-web/
├── AGENTS.md
├── README.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── apps/
│   ├── admin/
│   ├── agent/
│   ├── docs/
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
- `apps/docs` — dedicated SeasonalNet documentation frontend backed by allowlisted public docs sync

Each app is currently its own Next.js workspace package with its own local config and scripts.

### `packages/`

Shared code intended for reuse across multiple apps.

- `packages/shell` — shared SeasonalNet shell, layout, theme, authorization, markdown, and reused UI building blocks

The package area is now the active home for shared front-door shell work. New shared header, footer, layout, theme, authz, markdown, and reusable UI code should continue moving into `packages/shell` instead of being copied across app workspaces.

## Technology snapshot

Current workspace characteristics:

- npm workspaces at the repository root
- Next.js 16 application packages
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn-oriented component setup in the app workspaces
- Framer Motion and Lucide where used
- Leaflet present in the radio app
- Fumadocs present in the docs app
- NextAuth/Auth.js present in the admin and agent apps
- shared shell code in `packages/shell`

The root `package.json` defines repository-wide scripts and development tooling. Workspace membership is defined in `pnpm-workspace.yaml`.

## Working in this repository

Install dependencies at the repository root:

```bash
pnpm install
```

Run an individual app in development:

```bash
pnpm --filter @seasonalnet/www dev
pnpm --filter @seasonalnet/radio dev
pnpm --filter @seasonalnet/pbx dev
pnpm --filter @seasonalnet/prov dev
pnpm --filter @seasonalnet/admin dev
pnpm --filter @seasonalnet/agent dev
pnpm --filter @seasonalnet/docs dev
```

Build an individual app:

```bash
pnpm --filter @seasonalnet/www build
pnpm --filter @seasonalnet/radio build
pnpm --filter @seasonalnet/pbx build
pnpm --filter @seasonalnet/prov build
pnpm --filter @seasonalnet/admin build
pnpm --filter @seasonalnet/agent build
pnpm --filter @seasonalnet/docs build
```

Build the public docs app with its build-time docs sync first:

```bash
pnpm --filter @seasonalnet/docs build:public
```

Lint an individual app:

```bash
pnpm --filter @seasonalnet/www lint
pnpm --filter @seasonalnet/radio lint
pnpm --filter @seasonalnet/pbx lint
pnpm --filter @seasonalnet/prov lint
pnpm --filter @seasonalnet/admin lint
pnpm --filter @seasonalnet/agent lint
pnpm --filter @seasonalnet/docs lint
```

Build all workspaces from the root when broad validation is needed:

```bash
pnpm build
```

Lint all workspaces from the root when broad validation is needed:

```bash
pnpm lint
```

The root scripts use pnpm's recursive runner. Workspaces without the requested script, such as `packages/shell`, are skipped.

## Expected workflow

1. Make changes in this repository, not in the live deployment directories.
2. Validate the affected app locally or on the staging host.
3. Keep shared shell/layout work moving toward `packages/shell` instead of copying between apps.
4. Keep docs content changes in `seasonalnet-docs`; keep docs frontend glue and publishing policy enforcement here.
5. Commit reviewed changes to Forgejo from this canonical monorepo.
6. Promote to the live `/opt/seasonalnet/*` deployment trees as an explicit deployment action.

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

Documentation **content** for the dedicated docs experience should live in the separate `seasonalnet-docs` repository. Only docs-app glue, build-time sync code, frontend integration code, publishing policy enforcement, or monorepo-specific operational documentation belongs here.

The docs app may generate and overwrite managed synced content during explicit sync/build workflows, but only for allowlisted public documentation paths.

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

This repository is past the first-pass import stage and is now the active source home for the SeasonalNet frontend family.

Current operating direction includes:

- keeping all app workspaces, including docs, represented in root guidance
- continuing shared shell consolidation in `packages/shell`
- reducing duplicated config where practical
- keeping docs publication allowlisted and build-time synced
- tightening root-level developer ergonomics over time
- documenting deployment and cutover flow as the monorepo remains the normal operating path

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
- `apps/docs/PUBLISHING.md` for the public documentation publishing policy
