// src/lib/media-session.ts
export type MediaSessionMeta = {
  title: string
  artist?: string
  album?: string
  artworkUrl?: string // absolute or relative
}

export function setMediaSessionMeta(meta: MediaSessionMeta) {
  if (typeof window === "undefined") return
  const nav: any = navigator as any
  if (!("mediaSession" in nav) || !(window as any).MediaMetadata) return

  const artwork = meta.artworkUrl
    ? [
        // sizes are "hints" for most browsers; OK if not perfect
        { src: meta.artworkUrl, sizes: "192x192", type: "image/png" },
        { src: meta.artworkUrl, sizes: "512x512", type: "image/png" },
      ]
    : undefined

  nav.mediaSession.metadata = new (window as any).MediaMetadata({
    title: meta.title ?? "",
    artist: meta.artist ?? "",
    album: meta.album ?? "",
    artwork,
  })
}

export function setMediaSessionPlaybackState(state: "none" | "paused" | "playing") {
  if (typeof window === "undefined") return
  const nav: any = navigator as any
  if (!("mediaSession" in nav)) return
  try {
    nav.mediaSession.playbackState = state
  } catch {
    // some browsers are picky; safe to ignore
  }
}

export function bindBasicMediaSessionControls(audio: HTMLAudioElement | null) {
  if (!audio) return
  const nav: any = navigator as any
  if (!("mediaSession" in nav)) return

  const safe = (action: string, fn: (() => void) | null) => {
    try {
      nav.mediaSession.setActionHandler(action, fn)
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
