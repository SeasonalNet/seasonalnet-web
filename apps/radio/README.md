This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## SeasonalWeather endpoints

The radio app reads SeasonalWeather server-side endpoints for station-handled alerts, Icecast metadata, and Liquidsoap now-playing metadata. Defaults target the SeasonalWeather host on the SeasonalNet main LAN. Override these with environment variables in production rather than editing source constants.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SEASONALWEATHER_HOST` | `192.168.1.10` | Shared host used by the default URLs. |
| `SEASONALWEATHER_API_BASE_URL` | `http://$SEASONALWEATHER_HOST` | Base URL for the SeasonalWeather station API. |
| `SEASONALWEATHER_HANDLED_ALERTS_URL` | `$SEASONALWEATHER_API_BASE_URL/v1/handled-alerts` | Full station-handled alerts feed URL. |
| `SEASONALWEATHER_ICECAST_STATUS_URL` | `http://$SEASONALWEATHER_HOST:8000/status-json.xsl` | Icecast status fallback metadata. |
| `SEASONALWEATHER_NOWPLAYING_URL` | `http://$SEASONALWEATHER_HOST:7099/nowplaying` | Liquidsoap IP-RDS / now-playing metadata. |


The handled-alerts fetcher advertises `Accept: application/json, application/problem+json`. Normal feed responses remain JSON station-feed documents; upstream SeasonalWeather errors may be RFC 9457 Problem Details, which the radio BFF collapses into its degraded `ok: false` handled-alert collection with upstream problem metadata extensions.
## Alert map SAME coverage behavior

The service-area map understands county/city SAME codes, marine SAME zones, and state-wide SAME locations. State-wide `0SS000` inputs such as `024000` are treated as station-area wildcards for that state: the map expands them only to counties already present in the station's configured service area, not to every county statewide. The national `000000` code is intentionally ignored for local map coloring.
