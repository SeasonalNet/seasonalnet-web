// src/lib/server/station-handled-feed-config.ts
import "server-only"

export type StationHandledFeedConfig = {
  stationId: string
  feedUrl: string
  revalidateSeconds?: number
  bearerTokenEnv?: string
}

export const STATION_HANDLED_FEEDS: Record<string, StationHandledFeedConfig> = {
  seasonalweather: {
    stationId: "seasonalweather",
    feedUrl: "http://192.168.1.243/api/station/handled-alerts.json",
    revalidateSeconds: 10,
    // bearerTokenEnv: "SEASONALWEATHER_FEED_TOKEN",
  },
}
