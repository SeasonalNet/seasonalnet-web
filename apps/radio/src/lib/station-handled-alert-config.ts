// src/lib/station-handled-alert-config.ts

export type StationHandledAlertUiConfig = {
  stationId: string
  title?: string // UI label override if you want
  pollSeconds?: number
}

export const STATION_HANDLED_ALERTS: Record<string, StationHandledAlertUiConfig> = {
  jetstream: {
    stationId: "jetstream",
    title: "Station Alert Feed",
    pollSeconds: 60,
  },
}
