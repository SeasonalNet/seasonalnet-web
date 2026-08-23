// src/lib/media-session.ts
export type MediaSessionMeta = {
  title: string
  artist?: string
  album?: string
  artworkUrl?: string // absolute or relative
}

export function setMediaSessionMeta(meta: MediaSessionMeta) {
  if (typeof window === "undefined") return
  if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return

  const artwork = meta.artworkUrl
    ? [
        // sizes are "hints" for most browsers; OK if not perfect
        { src: meta.artworkUrl, sizes: "192x192", type: "image/png" },
        { src: meta.artworkUrl, sizes: "512x512", type: "image/png" },
      ]
    : undefined

  navigator.mediaSession.metadata = new MediaMetadata({
    title: meta.title ?? "",
    artist: meta.artist ?? "",
    album: meta.album ?? "",
    artwork,
  })
}

export function setMediaSessionPlaybackState(state: "none" | "paused" | "playing") {
  if (typeof window === "undefined") return
  if (!("mediaSession" in navigator)) return
  try {
    navigator.mediaSession.playbackState = state
  } catch {
    // some browsers are picky; safe to ignore
  }
}

export function bindBasicMediaSessionControls(audio: HTMLAudioElement | null) {
  if (!audio) return
  if (!("mediaSession" in navigator)) return

  const safe = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
    try {
      navigator.mediaSession.setActionHandler(action, fn)
    } catch {
      // unsupported action; ignore
    }
  }

  safe("play", () => audio.play())
  safe("pause", () => audio.pause())
  safe("stop", () => audio.pause())
  safe("seekbackward", () => (audio.currentTime = Math.max(0, audio.currentTime - 10)))
  safe("seekforward", () => (audio.currentTime = Math.min(audio.duration || Infinity, audio.currentTime + 10)))
}
