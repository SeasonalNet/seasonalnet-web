// src/lib/server/station-metadata.ts
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
        statusUrl:
          process.env.SEASONALWEATHER_ICECAST_STATUS_URL ??
          "http://seasonalweather:8000/status-json.xsl",

        nowPlayingUrl:
          process.env.SEASONALWEATHER_NOWPLAYING_URL ??
          "http://seasonalweather:7099/nowplaying",

        // I’d align defaults with your new annotation vibe:
        defaultArtist: "SeasonalNet",
        defaultAlbum: "Weather information for Baltimore, Washington DC, and surrounding areas",
        defaultArtworkUrl: "/apple-touch-icon.png",
      };

    default:
      return null;
  }
}
