// src/lib/server/station-handled-feed-config.ts
import "server-only"

import { seasonalWeatherHandledAlertsUrl } from "@/lib/server/seasonalweather-endpoints"

export type StationHandledFeedConfig = {
  stationId: string
  feedUrl: string
  revalidateSeconds?: number
  bearerTokenEnv?: string
}

export const STATION_HANDLED_FEEDS: Record<string, StationHandledFeedConfig> = {
  seasonalweather: {
    stationId: "seasonalweather",
    feedUrl: seasonalWeatherHandledAlertsUrl(),
    revalidateSeconds: 10,
    // bearerTokenEnv: "SEASONALWEATHER_FEED_TOKEN",
  },
}
