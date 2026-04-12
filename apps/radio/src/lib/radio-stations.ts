// src/lib/radio-stations.ts

export type RadioMount = {
  id: string
  title: string
  src: string // "/seasonalweather.mp3" or full URL
}

export type RadioStation = {
  id: string
  name: string
  description?: string
  tags?: string[]
  mounts: RadioMount[]

  // optional metadata knobs
  metadata?: {
    enabled: boolean
    artist?: string
    album?: string
    artworkUrl?: string
  }
}

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: "seasonalweather",
    name: "SeasonalWeather",
    description: "Weather automation stream mounts (Icecast).",
    tags: ["weather", "self-hosted"],
    mounts: [
      { id: "sw-ogg", title: "SeasonalWeather (OGG)", src: "/seasonalweather.ogg" },
      { id: "sw-mp3", title: "SeasonalWeather (MP3)", src: "/seasonalweather.mp3" },
      { id: "sw-wav", title: "SeasonalWeather (WAV)", src: "/seasonalweather.wav" },
    ],
    metadata: {
      enabled: true,
      artist: "SeasonalNet",
      album: "Weather information for Baltimore, Washington DC, and surrounding areas",
      artworkUrl: "/brand/favicon-white.png",
    },
  },

  // Future example:
  // {
  //   id: "seasonalmusic",
  //   name: "SeasonalMusic",
  //   description: "Music station.",
  //   tags: ["music", "radio"],
  //   mounts: [{ id: "sm-mp3", title: "SeasonalMusic (MP3)", src: "/seasonalmusic.mp3" }],
  //   metadata: { enabled: true, artist: "SeasonalMusic", album: "SeasonalNet", artworkUrl: "/brand/logo-white.png" },
  // },
]
