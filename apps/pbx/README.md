# SeasonalPBX SPA

SeasonalPBX public landing page and authenticated self-service dashboard.

## Development

Install dependencies from the monorepo root:

```bash
npm ci
```

Run the PBX app:

```bash
npm run dev --workspace @seasonalnet/pbx
```

Validate the app:

```bash
npm run lint --workspace @seasonalnet/pbx
npm run build --workspace @seasonalnet/pbx
```

## Self-service dashboard

The dashboard lives at `/dashboard` and uses NextAuth/Auth.js with Authentik. Browser requests only hit the local BFF routes under `/api/pbx/self/*`; those route handlers call `pbx-controld` with a server-side client credential.

Required runtime variables:

```env
AUTH_SECRET=
AUTH_AUTHENTIK_ISSUER=https://auth.example/application/o/pbx/
AUTH_AUTHENTIK_ID=
AUTH_AUTHENTIK_SECRET=
PBX_CONTROLD_BASE_URL=http://127.0.0.1:9091
PBX_CONTROLD_CLIENT_SECRET=
PBX_DISCORD_ID_CLAIM=discord_id
```

Optional access policy variables. If omitted, any authenticated Authentik session can access the PBX dashboard:

```env
AUTH_AUTHENTIK_PBX_STATUS_GROUPS=
AUTH_AUTHENTIK_PBX_OPERATIONS_GROUPS=
AUTH_AUTHENTIK_PBX_ADMINISTRATION_GROUPS=
```

For non-production development only, `PBX_DEV_DISCORD_ID` can supply a Discord ID when the Authentik claim is missing.

## Credential model

SIP secrets are not included in generic reads. The dashboard exposes explicit reveal and rotate actions:

- reveal: provision a trusted device with the current SIP secret
- rotate: intentionally replace the SIP secret after compromise or refresh

Existing extensions without credential custody need a rotate before dashboard reveal can work.
