"use client";

import * as React from "react";
import { ExternalLink, RefreshCw } from "lucide-react";

import {
  bindBasicMediaSessionControls,
  setMediaSessionMeta,
  setMediaSessionPlaybackState,
  type MediaSessionMeta,
} from "@/lib/media-session";

function newToken() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

type Props = {
  src: string; // "/seasonalweather.mp3"

  /**
   * Optional static metadata (per-station/per-mount).
   * If omitted, nothing changes from today.
   */
  mediaMeta?: MediaSessionMeta;

  /**
   * Optional dynamic metadata endpoint (JSON).
   * Only used while playing. Great for SeasonalWeather only.
   *
   * Expected JSON shape:
   * { "title": "...", "artist": "...", "album": "...", "artworkUrl": "..." }
   */
  mediaMetaUrl?: string;

  /**
   * Poll interval for mediaMetaUrl (ms). Default 15000.
   */
  mediaMetaPollMs?: number;
};

export function BustedAudio({ src, mediaMeta, mediaMetaUrl, mediaMetaPollMs }: Props) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const resumeAfterBustRef = React.useRef(false);

  const [token, setToken] = React.useState(() => newToken());
  const [playing, setPlaying] = React.useState(false);
  const [dynMeta, setDynMeta] = React.useState<MediaSessionMeta | null>(null);

  // The actual stream URL the browser fetches
  const bustedSrc = React.useMemo(() => {
    const join = src.includes("?") ? "&" : "?";
    return `${src}${join}cb=${encodeURIComponent(token)}`;
  }, [src, token]);

  // If the page comes back from BFCache (back/forward cache), refresh token automatically
  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setToken(newToken());
    };
    window.addEventListener("pageshow", onPageShow as any);
    return () => window.removeEventListener("pageshow", onPageShow as any);
  }, []);

  // When bustedSrc changes, force the <audio> element to reload and optionally resume
  React.useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    a.load();

    if (resumeAfterBustRef.current) {
      resumeAfterBustRef.current = false;
      a.play().catch(() => {
        // ignore autoplay policy / transient errors
      });
    }
  }, [bustedSrc]);

  const reconnect = React.useCallback(() => {
    const a = audioRef.current;
    resumeAfterBustRef.current = !!a && !a.paused;
    setToken(newToken());
  }, []);

  // Bind basic media key handlers (play/pause/seek) once.
  React.useEffect(() => {
    if (!audioRef.current) return;
    bindBasicMediaSessionControls(audioRef.current);
  }, []);

  // Keep playbackState updated (helps some UIs).
  React.useEffect(() => {
    setMediaSessionPlaybackState(playing ? "playing" : "paused");
  }, [playing]);

  // When playback starts (or metadata changes while playing), publish Media Session metadata.
  React.useEffect(() => {
    if (!playing) return;

    const meta = dynMeta ?? mediaMeta;
    if (meta) setMediaSessionMeta(meta);
  }, [
    playing,
    dynMeta,
    mediaMeta?.title,
    mediaMeta?.artist,
    mediaMeta?.album,
    mediaMeta?.artworkUrl,
  ]);

  // Optional: poll dynamic metadata while playing
  React.useEffect(() => {
    if (!playing) return;

    const url = mediaMetaUrl; // <-- capture + narrow for TS
    if (!url) return;

    const urlStr: string = url; // <-- THIS line is the magic

    let stopped = false;
    const pollMs = Math.max(3000, mediaMetaPollMs ?? 15000);

    async function tick() {
      try {
        const r = await fetch(urlStr, { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j: any = await r.json();

        const next: MediaSessionMeta = {
          title: String(j.title ?? mediaMeta?.title ?? ""),
          artist: j.artist != null ? String(j.artist) : mediaMeta?.artist,
          album: j.album != null ? String(j.album) : mediaMeta?.album,
          artworkUrl: j.artworkUrl != null ? String(j.artworkUrl) : mediaMeta?.artworkUrl,
        };

        if (!stopped) setDynMeta(next);
      } catch {
        // ignore transient failures
      }
    }

    tick();
    const t = window.setInterval(tick, pollMs);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [playing, mediaMetaUrl, mediaMetaPollMs, mediaMeta?.title, mediaMeta?.artist, mediaMeta?.album, mediaMeta?.artworkUrl]);

  return (
    <div className="space-y-2">
      <audio
        ref={audioRef}
        controls
        preload="none"
        className="w-full"
        src={bustedSrc}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={reconnect}
          title="Reconnect (fresh URL)"
          className="inline-flex h-8 flex-none items-center gap-2 whitespace-nowrap rounded-lg border bg-background/50 px-3 text-sm leading-none text-foreground/90 shadow-sm transition hover:bg-accent/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <RefreshCw className="h-4 w-4" />
          <span className="hidden sm:inline whitespace-nowrap">Reconnect</span>
        </button>

        <a
          href={bustedSrc}
          target="_blank"
          rel="noreferrer noopener"
          title="Open fresh stream URL"
          className="inline-flex h-8 flex-none items-center gap-2 whitespace-nowrap rounded-lg border bg-background/50 px-3 text-sm leading-none text-foreground/90 shadow-sm transition hover:bg-accent/40 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline whitespace-nowrap">Open fresh</span>
        </a>
      </div>
    </div>
  );
}
