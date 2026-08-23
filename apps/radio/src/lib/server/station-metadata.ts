// src/lib/server/station-metadata.ts
import { seasonalWeatherIcecastStatusUrl, seasonalWeatherNowPlayingUrl } from "./seasonalweather-endpoints"

export type StationMetaServerCfg = {
  statusUrl: string; // Icecast status-json.xsl
  nowPlayingUrl?: string; // Liquidsoap /nowplaying (JSON)
  defaultArtist: string;
  defaultAlbum?: string;
  defaultArtworkUrl?: string; // served from radio site, so clients can load it
};

export function getStationMetaServerCfg(stationId: string): StationMetaServerCfg | null {
  switch (stationId) {
    case "seasonalweather":
      return {
        statusUrl: seasonalWeatherIcecastStatusUrl(),

        nowPlayingUrl: seasonalWeatherNowPlayingUrl(),

        // I’d align defaults with your new annotation vibe:
        defaultArtist: "SeasonalNet",
        defaultAlbum: "Weather information for Baltimore, Washington DC, and surrounding areas",
        defaultArtworkUrl: "/apple-touch-icon.png",
      };

    default:
      return null;
  }
}
