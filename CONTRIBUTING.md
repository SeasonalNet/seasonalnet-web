# CONTRIBUTING.md

This file contains instructions for developers and other contributors working on the `seasonalnet-web` repository.

## Use of agents

Usage of agentic agents; such as Codex; Claude Code and the like are allowed; but expectations are in place.

When submitting a patch or report assisted by an agent:

- Ensure you understand what you are submitting. For code contributions; you must be able to understand and explain what your code does without needing an agent to summarize it for you.
- Ensure that your patch remains bounded and reviewable. A machine can generate thousands of lines of code in minutes. Human reviewing capacity won't scale the same way.

## Licensing

Your contributions to `seasonalnet-web`; should you choose to submit them; will be licensed under the repositories GNU AGPLv3 license.

## Working in this repository

The Makefile is the stable local and CI interface:

```bash
make install
make dev APP=www
make quality
make build
make ci
```

`APP` accepts a workspace suffix such as `www`, `radio`, `pbx`, `prov`,
`admin`, `agent`, or `docs`. `make quality` is the governed acceptance gate:
it runs the anti-suppression ratchet, ESLint for every app and the shared shell,
strict TypeScript checks, coverage-enabled Vitest, and full strict Knip
analysis. Coverage is ratcheted to the exact achieved uncovered-item counts,
globally and independently for every SPA; any additional uncovered statement,
branch, function, or line fails the gate. `make build`
runs every workspace production build serially to keep peak memory bounded.
`make ci` also verifies registry signatures and fails on moderate-or-higher
dependency advisories before running quality and production builds. Dependency
resolution enforces the release-age and lockfile trust policy in
`pnpm-workspace.yaml`.

The measured starting debt, current zero non-coverage debt ceilings, and exact
coverage ceilings are recorded in `quality/baselines.json`; the governance
rules are described in `quality/README.md`.

The underlying pnpm commands remain available when targeting one workspace.

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

The root scripts use pnpm's recursive runner. `packages/shell` participates in
lint and type checking; only deployable app workspaces define production builds.

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

## seasonalnet-docs

This repository is for frontend application code and the operational docs needed to represent its contents here.

Documentation **content** for the dedicated docs application lives in the separate `seasonalnet-docs` repository. Only docs-app glue, build-time sync code, frontend integration code, publishing policy enforcement, or monorepo-specific operational documentation belongs here.

The docs app may generate and overwrite managed synced content during explicit sync/build workflows, but only for allowlisted public documentation paths.
