import { afterEach, describe, expect, it, vi } from "vitest"

import {
  bindBasicMediaSessionControls,
  setMediaSessionMeta,
  setMediaSessionPlaybackState,
} from "./media-session"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("media session integration", () => {
  it("does nothing when browser media-session APIs are unavailable", () => {
    vi.stubGlobal("window", undefined)
    expect(() => setMediaSessionMeta({ title: "Station" })).not.toThrow()
    expect(() => setMediaSessionPlaybackState("playing")).not.toThrow()
    expect(() => bindBasicMediaSessionControls(null)).not.toThrow()
  })

  it("sets normalized metadata and artwork hints", () => {
    const mediaSession = { metadata: null }
    const metadataConstructor = vi.fn(function Metadata(this: Record<string, unknown>, value: Record<string, unknown>) {
      Object.assign(this, value)
    })
    vi.stubGlobal("window", {})
    vi.stubGlobal("navigator", { mediaSession })
    vi.stubGlobal("MediaMetadata", metadataConstructor)

    setMediaSessionMeta({ title: "Station", artworkUrl: "/art.png" })

    expect(metadataConstructor).toHaveBeenCalledWith(expect.objectContaining({
      title: "Station",
      artist: "",
      album: "",
      artwork: [
        { src: "/art.png", sizes: "192x192", type: "image/png" },
        { src: "/art.png", sizes: "512x512", type: "image/png" },
      ],
    }))
    expect(mediaSession.metadata).not.toBeNull()
  })

  it("binds playback controls and clamps seeks", () => {
    const handlers = new Map<string, MediaSessionActionHandler | null>()
    const mediaSession = {
      playbackState: "none",
      setActionHandler: vi.fn((action: string, handler: MediaSessionActionHandler | null) => handlers.set(action, handler)),
    }
    const audio = {
      currentTime: 5,
      duration: 12,
      play: vi.fn(),
      pause: vi.fn(),
    } as unknown as HTMLAudioElement
    vi.stubGlobal("window", {})
    vi.stubGlobal("navigator", { mediaSession })

    setMediaSessionPlaybackState("playing")
    bindBasicMediaSessionControls(audio)
    handlers.get("play")?.({ action: "play" })
    handlers.get("pause")?.({ action: "pause" })
    handlers.get("stop")?.({ action: "stop" })
    handlers.get("seekbackward")?.({ action: "seekbackward" })
    expect(audio.currentTime).toBe(0)
    audio.currentTime = 8
    handlers.get("seekforward")?.({ action: "seekforward" })

    expect(mediaSession.playbackState).toBe("playing")
    expect(audio.currentTime).toBe(12)
    expect(audio.play).toHaveBeenCalledOnce()
    expect(audio.pause).toHaveBeenCalledTimes(2)
  })

  it("tolerates browsers that reject playback state or action handlers", () => {
    const mediaSession = {
      set playbackState(_value: string) {
        throw new Error("unsupported")
      },
      setActionHandler: vi.fn(() => {
        throw new Error("unsupported")
      }),
    }
    vi.stubGlobal("window", {})
    vi.stubGlobal("navigator", { mediaSession })

    expect(() => setMediaSessionPlaybackState("paused")).not.toThrow()
    expect(() => bindBasicMediaSessionControls({ play: vi.fn(), pause: vi.fn() } as unknown as HTMLAudioElement)).not.toThrow()
  })
})
