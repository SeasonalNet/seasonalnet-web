# AGENTS.md

## Purpose

This repository contains the SeasonalNet frontend monorepo.

It is the canonical source workspace for SeasonalNet web applications and shared frontend packages. Agents working here must treat this repository as the place where frontend source changes are developed, reviewed, and committed, while remembering that the live sites may still be served from separate deployment directories on the host.

## Repository identity

- Repository name: `seasonalnet-web`
- Primary role: source-controlled frontend monorepo
- Stack: npm workspaces, Next.js, React, TypeScript, Tailwind
- Canonical source layout: `apps/*` and `packages/*`

## Operational context

This repository is **not automatically the live web root**.

On SeasonalWeb, the currently served frontend deployments may still live under `/opt/seasonalnet/` in directories or short-path aliases such as:

- `www-spa`
- `radio-spa`
- `pbx-spa`
- `prov-spa`
- `admin-spa`
- `agent-spa`
- `docs-spa`
- other existing deployment-prefixed variants already present on the system

When working in `/opt/git-staging/seasonalnet-web` or another clone of this repository:

- treat it as the canonical development/staging tree
- use it for code changes, validation, and commits
- do not assume changes here are live
- do not silently edit `/opt/seasonalnet/*` deployment trees as a substitute for repository work
- do not confuse deployment aliases with canonical source directories

## Source layout

### Applications

`apps/*` contains deployable frontend applications.

Current apps:

- `apps/www` — main public SeasonalNet site
- `apps/radio` — SeasonalRadio frontend
- `apps/pbx` — SeasonalPBX frontend
- `apps/prov` — provisioning frontend
- `apps/admin` — centralized admin/control-plane frontend
- `apps/agent` — Seasonal Agent operator chat frontend
- `apps/docs` — dedicated SeasonalNet documentation frontend backed by allowlisted public docs sync

### Shared packages

`packages/*` contains reusable code shared by multiple apps.

Current shared package target:

- `packages/shell` — canonical home for shared shell, layout, theme, authz, markdown, and reused UI building blocks

## Hard rules

1. Use canonical app directories only.
   - Work in `apps/www`, `apps/radio`, `apps/pbx`, `apps/prov`, `apps/admin`, `apps/agent`, and `apps/docs`.
   - Do not create or commit deployment alias directories that mirror `/opt/seasonalnet/*-spa` naming shortcuts.

2. Shared shell code belongs in `packages/shell`.
   - Do not copy-and-paste the same header, footer, layout, theme, authz, markdown, or shared card primitives across apps when a shared extraction is practical.
   - Prefer consolidation over parallel drift.

3. Do not commit runtime junk.
   - Never commit `node_modules`, `.next`, local `.env` files, secrets, tokens, caches, logs, or temporary deployment artifacts.

4. Preserve SeasonalNet visual identity.
   - black-and-white only unless a deliberate exception is requested
   - standard site header and footer where applicable
   - modular card-based layout
   - concise operational copy
   - no sidebar in non-docs apps unless explicitly justified

5. Keep non-docs apps operationally focused.
   - Avoid marketing fluff.
   - Avoid verbose explanatory copy where short summaries are sufficient.
   - Favor UI that communicates system state and available actions directly.

6. Keep docs content out of this repo unless it is frontend glue or managed sync output.
   - Dedicated documentation source content belongs in `seasonalnet-docs`.
   - Monorepo-specific operational docs, docs-app glue, publishing policy enforcement, and deterministic synced public docs output may belong here.
   - Runtime fetching from `seasonalnet-docs` is not allowed; docs sync must happen at build/deploy time.
   - Only explicitly allowlisted public docs paths may be synced into `apps/docs`.

7. Respect the staging-versus-live split.
   - A successful local build is validation, not deployment.
   - Promotion to live directories is a separate operational action.

## Admin/front-door expectations

For admin and similar operator surfaces, prefer SoA grouping inside each module or managed-system card:

- Status
- Operations
- Administration

The admin surface should read like a control plane, not a blog or marketing site.

## Expected workflow for agents

1. Read this file before making repository changes.
2. If working under a subdirectory with its own `AGENTS.md`, read that file too and follow the more specific guidance.
3. Inspect the current app/package structure before introducing new files.
4. Make the minimum coherent set of source changes.
5. Reuse or extract shared shell/UI code instead of cloning it.
6. Validate the affected workspace(s) with build or lint commands when practical.
7. Summarize exactly what changed and what still remains manual, especially around deployment.

## Commands

Install dependencies from the repo root:

```bash
pnpm install
```

Run a specific app:

```bash
pnpm --filter @seasonalnet/www dev
pnpm --filter @seasonalnet/radio dev
pnpm --filter @seasonalnet/pbx dev
pnpm --filter @seasonalnet/prov dev
pnpm --filter @seasonalnet/admin dev
pnpm --filter @seasonalnet/agent dev
pnpm --filter @seasonalnet/docs dev
```

Build a specific app:

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

Lint a specific app:

```bash
pnpm --filter @seasonalnet/www lint
pnpm --filter @seasonalnet/radio lint
pnpm --filter @seasonalnet/pbx lint
pnpm --filter @seasonalnet/prov lint
pnpm --filter @seasonalnet/admin lint
pnpm --filter @seasonalnet/agent lint
pnpm --filter @seasonalnet/docs lint
```

Run all workspace builds when broad validation is needed:

```bash
pnpm build
```

Run all workspace lint jobs when broad validation is needed:

```bash
pnpm lint
```

The root scripts use pnpm's recursive runner. Workspaces without the requested script, such as `packages/shell`, are skipped.

## Change preferences

Prefer:

- small, reviewable commits
- root-cause fixes instead of superficial duplication
- improvements that reduce cross-app drift
- documentation that reflects actual operating reality on SeasonalWeb
- explicit notes when something is still staging-only or not yet wired into live deployment

Avoid:

- silent architecture drift between apps
- app-local shell forks that should be shared
- introducing sidebars or color-heavy UI into the standard front-door surfaces without a clear reason
- writing docs that imply `/opt/git-staging/seasonalnet-web` is already the live runtime tree

## Commit conventions

Use conventional commits.

Use `docs:` for documentation-only changes.

Examples:

- `feat: extract shared footer into shell package`
- `fix: align pbx layout with canonical shell spacing`
- `refactor: move shared card primitives into packages/shell`
- `docs: expand monorepo README and AGENTS guidance`

## When repository and host reality differ

If the codebase and the live host layout are not yet fully aligned:

- document the mismatch plainly
- preserve canonical source structure in the repository
- avoid encoding deployment quirks as permanent source-layout decisions
- prefer moving the live environment toward the repo, not the repo toward ad-hoc deployment sprawl
