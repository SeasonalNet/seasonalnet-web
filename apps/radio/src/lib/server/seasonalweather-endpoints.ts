// src/lib/server/seasonalweather-endpoints.ts
const DEFAULT_SEASONALWEATHER_HOST = "192.168.1.10"

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed.replace(/\/+$/, "") : undefined
}

function seasonalWeatherHost(): string {
  return cleanEnv(process.env.SEASONALWEATHER_HOST) ?? DEFAULT_SEASONALWEATHER_HOST
}

function seasonalWeatherApiBaseUrl(): string {
  return (
    cleanEnv(process.env.SEASONALWEATHER_API_BASE_URL) ??
    cleanEnv(process.env.SEASONALWEATHER_API_BASE) ??
    `http://${seasonalWeatherHost()}`
  )
}

export function seasonalWeatherHandledAlertsUrl(): string {
  return (
    cleanEnv(process.env.SEASONALWEATHER_HANDLED_ALERTS_URL) ??
    `${seasonalWeatherApiBaseUrl()}/v1/handled-alerts`
  )
}

export function seasonalWeatherIcecastStatusUrl(): string {
  return (
    cleanEnv(process.env.SEASONALWEATHER_ICECAST_STATUS_URL) ??
    `http://${seasonalWeatherHost()}:8000/status-json.xsl`
  )
}

export function seasonalWeatherNowPlayingUrl(): string {
  return (
    cleanEnv(process.env.SEASONALWEATHER_NOWPLAYING_URL) ??
    `http://${seasonalWeatherHost()}:7099/nowplaying`
  )
}
