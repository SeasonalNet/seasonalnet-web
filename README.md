# seasonalnet-web

SeasonalNet frontend monorepo for the public site family and related web front ends.

## What this repository is

This repository is the **development and source-of-truth monorepo** for the SeasonalNet web stack; it's outputs are
built into Docker containers that run on `moon` for every SPA this repo manages.

> [!NOTE]
> What is developed and present here is not necessarily immediately what runs on the live subdomains. That still requires
> `moon` to pick up new images from the registries and switch over to them to become truly fully deployed.

## Repository goals

- Keep all SeasonalNet frontend apps in one workspace.
- Reduce shell and layout duplication across apps.
- Establish a canonical place for shared frontend code.
- Keep the dedicated docs frontend wired to public documentation policy without storing the source docs repo here.
- Make cross-app refactors practical.

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
- `apps/agent` — Seasonal Agent operator chat frontend over the local agent API (not presently used or updated; code still kept under this repository)
- `apps/docs` — dedicated SeasonalNet documentation frontend backed by allowlisted public docs sync

Each app is currently its own Next.js workspace package with its own local config and scripts.

### `packages/`

Shared code intended for reuse across multiple apps.

- `packages/shell` — shared SeasonalNet shell, layout, theme, authorization, markdown, and reused UI building blocks

The package area deals with shared front-end UI shell code for every SPA.

## License

> [!NOTE]
> `seasonalnet-web` is licensed under the GNU AGPLv3 license. (Version 3 only) See [LICENSE](./LICENSE).

## See also

- [AGENTS.md](./AGENTS.md) for agent-focused repository rules and workflow constraints
- [CONTRIBUTING.md](./CONTRIBUTING.md) for developer and contributing guidance
- [CONTAINER_SECURITY.md](CONTAINER_SECURITY.md) for the hardened Compose
launch, writable paths, and deployment requirements
- [VERSIONING.md](VERSIONING.md) for Git-derived versions, release tags and local builds.
- individual `apps/*/README.md` files for app-specific notes as they are expanded
- and `apps/docs/PUBLISHING.md` for the public documentation publishing policy.
