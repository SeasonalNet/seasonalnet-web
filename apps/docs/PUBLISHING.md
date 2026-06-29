# Docs publishing policy

This app may only publish an explicit allowlist of public docs from `seasonalnet-docs`.

## Source of truth

- Canonical content repo: `seasonalnet-docs`
- Canonical remote: `https://git.seasonalnet.org/Seasonal_Currency/seasonalnet-docs`
- Default staging checkout on SeasonalWeb: `/opt/git-staging/seasonalnet-docs`

## Public allowlist

Only the following source files may be copied into `apps/docs/content/docs`:

| Source path | Published route | Output path |
|---|---|---|
| `README.md` | `/docs` | `index.mdx` |
| `PLATFORM.md` | `/docs/about/platform` | `about/platform.mdx` |
| `SERVICES.md` | `/docs/about/services` | `about/services.mdx` |
| `NETWORK.md` | `/docs/topology` | `topology/index.mdx` |
| `LANs/seasonalnet-lan-map.md` | `/docs/topology/lans/main-lan` | `topology/lans/main-lan.mdx` |
| `LANs/seasonalcme-network-map.md` | `/docs/topology/lans/seasonalcme` | `topology/lans/seasonalcme.mdx` |
| `LANs/phonelan-map.md` | `/docs/topology/lans/phone-lan` | `topology/lans/phone-lan.mdx` |
| `PROJECTS.md` | `/docs/projects` | `projects/index.mdx` |
| `POLICIES.md` | `/docs/policies` | `policies/index.mdx` |
| `Policies/privacy.md` | `/docs/policies/privacy` | `policies/privacy.mdx` |
| `Policies/terms.md` | `/docs/policies/terms` | `policies/terms.mdx` |
| `Policies/acceptable-use.md` | `/docs/policies/acceptable-use` | `policies/acceptable-use.mdx` |

Generated section indexes under `/docs/about` and `/docs/topology/lans`, together with section metadata such as `/docs/policies/meta.json`, are controlled by `public-docs-policy.mjs` and are not copied from arbitrary source files.

Any new public page requires an intentional policy edit before it may be synced or published.

## Compatibility redirects

The former network routes are redirected to the new topology section by the docs app Next.js config:

- `/docs/network` -> `/docs/topology`
- `/docs/network/:path*` -> `/docs/topology/:path*`

These redirects preserve old links while making Topology the first-class section name.

## Explicit denylist

These paths must never be published:

- `VMs/`
- any future private or operational-only subtree that is not explicitly allowlisted

The denylist is enforced in `apps/docs/scripts/public-docs-policy.mjs`.

## Managed outputs

The sync pipeline may only write the managed output files declared in `public-docs-policy.mjs`.
That prevents accidental publication of stray files or whole-directory copies.

## Operating rules

- Do not fetch docs from Forgejo at request time.
- Do not clone the entire docs repo into `apps/docs/content/docs`.
- Do not auto-publish newly added files without updating the allowlist.
- Keep frontend glue in this repo; keep canonical documentation content in `seasonalnet-docs`.

## Expected workflow

1. Update public docs in `seasonalnet-docs`.
2. Review whether the changed file is already on the allowlist.
3. Run the sync pipeline from `apps/docs`.
4. Build and verify `@seasonalnet/docs`.
5. Deploy separately after staging validation.
