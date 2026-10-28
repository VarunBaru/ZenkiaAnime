import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Info,
  Grid3x3,
  List,
  Cast,
  Maximize,
  ExternalLink,
  Check,
  Play,
} from "lucide-react";
import { toast } from "sonner";
import { animeQuery, episodesQuery } from "@/lib/jikan";
import { anilistQuery, embedUrl } from "@/lib/anilist";
import { providerLang, usePreferences } from "@/lib/preferences";
import { PanelSkeleton } from "@/components/states";
import { useAuth } from "@/hooks/useAuth";
import {
  formatClock,
  historyQuery,
  recordEpisodeWatch,
  saveEpisodeProgress,
  type PlaybackProgress,
} from "@/lib/library";

/**
 * AniEmbed documents a postMessage API (see aniembed.se → API Docs):
 * events `ready`, `play`/`pause`, `progress` (every ~5s), `ended`, `next`/`previous`,
 * each carrying { currentTime, duration, percentage, paused }, and commands such as
 * `seek { time }`. No API key needed. We only use those documented messages.
 */
const PLAYER_ORIGIN = "https://aniembed.se";
const SAVE_INTERVAL_MS = 12_000;
const COMPLETE_PERCENT = 92;

type PlayerMessage = {
  source?: string;
  type?: string;
  name?: string;
  data?: { currentTime?: number; duration?: number; paused?: boolean };
};

export const Route = createFileRoute("/watch/$animeId/$episodeNumber")({
  head: () => {
    const description = "Watch this episode on Zenkia Anime with an authorised embedded player.";
    return {
      meta: [
        { title: "Watch — Zenkia Anime" },
        { name: "description", content: description },
        { property: "og:title", content: "Watch — Zenkia Anime" },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.episode" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: WatchPage,
  errorComponent: () => <WatchError message="This episode couldn't be opened." />,
  notFoundComponent: () => <WatchError message="This episode couldn't be found." />,
});

function WatchError({ message, animeId }: { message: string; animeId?: string }) {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
      <div className="ink-panel halftone p-8 text-center">
        <p className="font-display text-2xl text-accent sm:text-3xl">Player unavailable</p>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {animeId ? (
            <Link
              to="/anime/$animeId"
              params={{ animeId }}
              className="ink-panel-sm ink-press inline-block bg-card px-5 py-2.5 font-mono text-xs font-bold tracking-widest uppercase"
            >
              ← Back to anime
            </Link>
          ) : (
            <Link
              to="/browse"
              search={{ genre: "", type: "", order: "popularity", page: 1 }}
              className="ink-panel-sm ink-press inline-block bg-card px-5 py-2.5 font-mono text-xs font-bold tracking-widest uppercase"
            >
              ← Back to browse
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function WatchPage() {
  const { animeId, episodeNumber } = Route.useParams();
  const id = Number(animeId);
  const episode = Math.max(1, Number(episodeNumber) || 1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [frameFailed, setFrameFailed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { language } = usePreferences();
  const preferredLang = providerLang(language);
  // Manual override for this visit; null = follow the saved EN/JP preference.
  const [sourceLang, setSourceLang] = useState<"sub" | "dub" | null>(null);
  // Manual override for stream server provider
  const [streamServer, setStreamServer] = useState<string>("nero");
  // Episode range filter for long series
  const [episodeRange, setEpisodeRange] = useState(0);
  // Episode view mode: grid or list
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  // Auto-play next episode when the current one finishes.
  const [autoPlay, setAutoPlay] = useState<boolean>(() => {
    try {
      return localStorage.getItem("zenkia:auto-play-next") !== "false";
    } catch {
      return true;
    }
  });
  const [nextCountdown, setNextCountdown] = useState<number | null>(null);
  const nextCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anime = useQuery(animeQuery(id));
  const anilist = useQuery(anilistQuery(id));
  const episodes = useQuery({ ...episodesQuery(id), enabled: anime.isSuccess });
  const history = useQuery(historyQuery(user?.id));

  const title = anime.data ? anime.data.title_english || anime.data.title : null;

  useEffect(() => {
    if (title) document.title = `${title} — Episode ${episode} — Zenkia Anime`;
  }, [title, episode]);

  // Sync range tab to current episode automatically when episode changes
  useEffect(() => {
    const targetRange = Math.floor((episode - 1) / 100);
    setEpisodeRange(targetRange);
  }, [episode]);

  // Episode-level history: one row per user + anime + episode.
  useEffect(() => {
    if (!user || !anime.data) return;
    recordEpisodeWatch(user.id, anime.data, episode)
      .then(() => queryClient.invalidateQueries({ queryKey: ["history"] }))
      .catch((error: unknown) => {
        console.error("[watch] episode history save failed", error);
        toast.error(
          `Watch history couldn't be saved: ${error instanceof Error ? error.message : "Please try again."}`,
        );
      });
  }, [user, anime.data, episode, queryClient]);

  // ---- Timeline tracking via AniEmbed's documented postMessage API ----
  const saved = useMemo(
    () => history.data?.find((r) => r.mal_id === id && r.episode_number === episode),
    [history.data, id, episode],
  );
  const [live, setLive] = useState<{ t: number; d: number } | null>(null);
  const [resumeChoice, setResumeChoice] = useState<"pending" | "done">("pending");
  const playerReady = useRef(false);
  const pendingSeek = useRef<number | null>(null);

  const sendCommand = useCallback((name: string, data: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage(
      {
        source: "aniembed",
        version: 1,
        type: "command",
        name,
        requestId: crypto.randomUUID(),
        data,
      },
      PLAYER_ORIGIN,
    );
  }, []);

  useEffect(() => {
    setLive(null);
    setResumeChoice("pending");
    playerReady.current = false;
    pendingSeek.current = null;
  }, [id, episode]);

  useEffect(() => {
    if (!user || !anime.data) return;
    const userId = user.id;
    const animeRef = anime.data;
    const ep = episode;
    let latest: PlaybackProgress | null = null;
    let lastSavedAt = 0;
    let lastSavedTime = -1;
    let writesDisabled = false;

    const save = (force: boolean) => {
      if (!latest || writesDisabled) return;
      if (!force && Date.now() - lastSavedAt < SAVE_INTERVAL_MS) return;
      if (Math.abs(latest.currentTime - lastSavedTime) < 1 && !latest.completed) return;
      lastSavedAt = Date.now();
      lastSavedTime = latest.currentTime;
      saveEpisodeProgress(userId, animeRef, ep, latest)
        .then(() => queryClient.invalidateQueries({ queryKey: ["history"] }))
        .catch((e) => {
          // Stop writing for this episode; episode-level history still exists.
          writesDisabled = true;
          console.warn("[watch] progress save failed, tracking paused", e);
        });
    };

    const onMessage = (event: MessageEvent) => {
      const frame = iframeRef.current;
      const msg = event.data as PlayerMessage | undefined;
      if (!frame || event.source !== frame.contentWindow || event.origin !== PLAYER_ORIGIN) return;
      if (!msg || msg.source !== "aniembed" || msg.type !== "event") return;

      if (msg.name === "ready") {
        playerReady.current = true;
        if (pendingSeek.current != null) {
          sendCommand("seek", { time: pendingSeek.current });
          pendingSeek.current = null;
        }
      }
      if (msg.name === "next") return void navigateEpisode(ep + 1);
      if (msg.name === "previous") return void (ep > 1 && navigateEpisode(ep - 1));

      const d = msg.data;
      if (!d || typeof d.currentTime !== "number" || typeof d.duration !== "number") return;
      if (!(d.duration > 0)) return;
      const ended = msg.name === "ended";
      const pct = (d.currentTime / d.duration) * 100;
      latest = {
        currentTime: ended ? d.duration : d.currentTime,
        duration: d.duration,
        completed: ended || pct >= COMPLETE_PERCENT || (latest?.completed ?? false),
      };
      setLive({ t: latest.currentTime, d: d.duration });
      if (msg.name === "progress") save(false);
      else if (msg.name === "pause" || ended) save(true);

      if (ended && hasNext) {
        if (nextCountdownRef.current) {
          clearInterval(nextCountdownRef.current);
          nextCountdownRef.current = null;
        }
        if (autoPlay) {
          let remaining = 5;
          setNextCountdown(remaining);
          nextCountdownRef.current = setInterval(() => {
            remaining -= 1;
            if (remaining <= 0) {
              if (nextCountdownRef.current) {
                clearInterval(nextCountdownRef.current);
                nextCountdownRef.current = null;
              }
              setNextCountdown(null);
              void navigateEpisode(ep + 1);
            } else {
              setNextCountdown(remaining);
            }
          }, 1000);
        }
      }
    };

    const onHide = () => {
      save(true);
      if (nextCountdownRef.current) {
        clearInterval(nextCountdownRef.current);
        nextCountdownRef.current = null;
        setNextCountdown(null);
      }
    };
    window.addEventListener("message", onMessage);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("pagehide", onHide);
      save(true); // episode change or leaving the Watch page
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, anime.data, episode, queryClient, sendCommand]);

  const resumeAt =
    saved && !saved.completed && saved.progress_seconds != null && saved.progress_seconds >= 10
      ? Number(saved.progress_seconds)
      : null;

  const doResume = () => {
    if (resumeAt == null) return;
    if (playerReady.current) sendCommand("seek", { time: resumeAt });
    else pendingSeek.current = resumeAt;
    setResumeChoice("done");
  };
  const doStartOver = () => {
    if (playerReady.current) sendCommand("seek", { time: 0 });
    pendingSeek.current = null;
    setResumeChoice("done");
  };

  const totalFromList = episodes.data?.length ?? 0;
  const total = totalFromList || anime.data?.episodes || 0;
  const hasPrev = episode > 1;
  const hasNext = total ? episode < total : true;

  function navigateEpisode(next: number) {
    navigate({
      to: "/watch/$animeId/$episodeNumber",
      params: { animeId, episodeNumber: String(next) },
    });
  }
  const go = navigateEpisode;

  if (anime.isPending || anilist.isPending) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-8 sm:px-6">
        <PanelSkeleton className="aspect-video w-full" />
        <PanelSkeleton className="h-24 w-full" />
      </div>
    );
  }

  if (anime.isError || !anime.data) {
    return <WatchError message="We couldn't load this anime's details right now." />;
  }

  if (anilist.isError || !anilist.data) {
    return (
      <WatchError
        animeId={animeId}
        message="No player is available for this title yet. You can still browse its details and official sources."
      />
    );
  }

  const activeLang = sourceLang ?? preferredLang;
  const src = embedUrl(anilist.data.id, episode, activeLang, streamServer);
  const currentEpisode = episodes.data?.[episode - 1];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/anime/$animeId"
          params={{ animeId }}
          className="ink-panel-sm ink-press inline-block bg-card px-4 py-2 font-mono text-[11px] font-bold tracking-widest uppercase"
        >
          ← Back to anime
        </Link>
        <span className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Episode {episode}
          {total ? ` / ${total}` : ""}
        </span>
      </div>

      <div className="ink-panel overflow-hidden p-2">
        {frameFailed ? (
          <div className="grid aspect-video w-full place-items-center bg-muted px-6 text-center">
            <p className="max-w-[40ch] text-sm text-muted-foreground">
              The player couldn't load this episode. Try another episode, or use the official
              sources listed on the anime page.
            </p>
          </div>
        ) : (
          <div className="relative aspect-video w-full bg-black group">
            <iframe
              ref={iframeRef}
              key={src}
              src={src}
              title={`${title} episode ${episode}`}
              className="absolute inset-0 size-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; display-capture"
              allowFullScreen
              referrerPolicy="origin"
              onError={() => setFrameFailed(true)}
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-4 left-4 z-[5] select-none"
            >
              <img
                src="/brand-wordmark.webp"
                alt=""
                draggable={false}
                className="w-20 opacity-55 drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] sm:w-28"
              />
            </div>
          </div>
        )}
      </div>

      <div className="ink-panel-sm flex min-w-0 flex-wrap items-center gap-3 bg-card p-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] font-bold tracking-widest uppercase">
            Audio source
          </span>
          <div
            role="radiogroup"
            aria-label="Audio source"
            className="inline-flex border-2 border-border"
          >
            {(["dub", "sub"] as const).map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={activeLang === l}
                onClick={() => setSourceLang(l)}
                className={`px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  activeLang === l
                    ? "bg-accent text-accent-foreground underline underline-offset-4"
                    : "hover:bg-muted"
                }`}
              >
                {l === "dub" ? "English dub" : "Japanese (sub)"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              aria-pressed={autoPlay}
              onClick={() => {
                const next = !autoPlay;
                setAutoPlay(next);
                try {
                  localStorage.setItem("zenkia:auto-play-next", next ? "true" : "false");
                } catch {
                  /* storage unavailable */
                }
              }}
              title="Auto-play next episode when this one ends"
              className="inline-flex items-center gap-1.5 border-2 border-border bg-background px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase hover:bg-muted"
            >
              {autoPlay ? <Check className="size-3.5" /> : <Play className="size-3.5" />}
              Auto next
            </button>
          </div>
        </div>

        {nextCountdown != null && (
          <div className="basis-full animate-in fade-in zoom-in-95 border-t border-border/50 pt-3 mt-1 text-center">
            <p className="font-display text-sm">
              Next episode in <span className="text-accent">{nextCountdown}s</span>
            </p>
            <button
              onClick={() => {
                if (nextCountdownRef.current) clearInterval(nextCountdownRef.current);
                setNextCountdown(null);
                void navigateEpisode(episode + 1);
              }}
              className="mt-2 ink-panel-sm ink-press bg-accent px-4 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
            >
              Play next now
            </button>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] font-bold tracking-widest uppercase">Server</span>
          <div className="flex flex-wrap gap-1">
            {(["nero", "yuki", "zuna", "loli", "sora"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStreamServer(s)}
                className={`ink-panel-sm px-2.5 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase ${
                  streamServer === s
                    ? "bg-accent text-accent-foreground border-2 border-accent"
                    : "bg-background border-2 border-border hover:border-accent/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <p className="basis-full text-xs text-muted-foreground border-t border-border/50 pt-3 mt-1">
          {activeLang === "dub"
            ? "English dub requested. Try different servers if video is black or won't load."
            : "Japanese original audio with subtitles requested."}
          <br />
          Some streams may show ads. A browser ad-blocking extension may help reduce them.
          <button
            onClick={() => window.open(src, "_blank")}
            className="ml-2 text-accent underline underline-offset-4 hover:text-accent/80 inline-flex items-center gap-1"
          >
            Open player in new tab <ExternalLink className="size-3" />
          </button>
        </p>
      </div>

      {user && resumeAt != null && resumeChoice === "pending" && !frameFailed ? (
        <div className="ink-panel-sm flex flex-wrap items-center gap-3 bg-card p-3">
          <p className="font-display text-base">Resume from {formatClock(resumeAt)}</p>
          <div className="ml-auto flex gap-2">
            <button
              onClick={doResume}
              className="ink-panel-sm ink-press bg-accent px-4 py-2 font-mono text-[11px] font-bold tracking-widest text-accent-foreground uppercase"
            >
              Resume
            </button>
            <button
              onClick={doStartOver}
              className="ink-panel-sm ink-press bg-card px-4 py-2 font-mono text-[11px] font-bold tracking-widest uppercase"
            >
              Start over
            </button>
          </div>
        </div>
      ) : null}

      {user
        ? (() => {
            const t =
              live?.t ?? (saved?.progress_seconds != null ? Number(saved.progress_seconds) : null);
            const d =
              live?.d ?? (saved?.duration_seconds != null ? Number(saved.duration_seconds) : null);
            if (t == null || !d) return null;
            const pct = Math.min(100, Math.round((t / d) * 100));
            return (
              <div className="space-y-1">
                <div
                  className="h-2.5 w-full border-2 border-border bg-muted"
                  role="progressbar"
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Episode progress"
                >
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase tabular-nums">
                  {live ? "Progress" : "Saved progress"} · {pct}% · {formatClock(t)} /{" "}
                  {formatClock(d)}
                  {saved?.completed || pct >= COMPLETE_PERCENT ? " · Completed" : ""}
                </p>
              </div>
            );
          })()
        : null}

      <header className="space-y-2">
        <h1 className="font-display text-2xl leading-tight break-words sm:text-3xl">{title}</h1>
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          Episode {episode}
          {currentEpisode?.title && currentEpisode.title.toLowerCase() !== `episode ${episode}`
            ? ` — ${currentEpisode.title}`
            : ""}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => hasPrev && go(episode - 1)}
          disabled={!hasPrev}
          className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-card px-4 py-2.5 font-mono text-[11px] font-bold tracking-widest uppercase disabled:opacity-40"
        >
          <ChevronLeft className="size-4" strokeWidth={3} /> Previous
        </button>
        <button
          onClick={() => hasNext && go(episode + 1)}
          disabled={!hasNext}
          className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-4 py-2.5 font-mono text-[11px] font-bold tracking-widest text-accent-foreground uppercase disabled:opacity-40"
        >
          Next <ChevronRight className="size-4" strokeWidth={3} />
        </button>
      </div>

      {/* Episode Selector Section */}
      <div className="ink-panel p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-mono text-[10px] font-bold tracking-wide text-muted-foreground uppercase sm:text-[11px] sm:tracking-widest">
              Select Episode
            </h3>
            {/* Toggle View Mode */}
            <div className="inline-flex border-2 border-border">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid View"
                className={`p-1.5 ${viewMode === "grid" ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted"}`}
              >
                <Grid3x3 className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List View with Titles"
                className={`p-1.5 ${viewMode === "list" ? "bg-accent text-accent-foreground" : "bg-card hover:bg-muted"}`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>

          {/* Range pagination for long series */}
          {total > 100 &&
            (() => {
              const ranges = Math.ceil(total / 100);
              return (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: ranges }, (_, i) => {
                    const start = i * 100 + 1;
                    const end = Math.min((i + 1) * 100, total);
                    return (
                      <button
                        key={i}
                        onClick={() => setEpisodeRange(i)}
                        className={`px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest uppercase ${
                          episodeRange === i
                            ? "bg-accent text-accent-foreground"
                            : "bg-card hover:bg-muted"
                        }`}
                      >
                        {start}-{end}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
        </div>

        {(() => {
          const allEpisodes = totalFromList
            ? episodes.data!.map((ep, i) => ({
                n: i + 1,
                label: ep.title?.trim() || `Episode ${ep.mal_id}`,
                jpTitle: ep.title_japanese,
                aired: ep.aired,
                filler: ep.filler,
              }))
            : Array.from({ length: Math.max(total, episode) }, (_, i) => ({
                n: i + 1,
                label: `Episode ${i + 1}`,
                jpTitle: null,
                aired: null,
                filler: false,
              }));

          const start = episodeRange * 100;
          const end = start + 100;
          const filtered = allEpisodes.slice(start, end);

          if (viewMode === "list") {
            return (
              <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
                {filtered.map((opt) => (
                  <button
                    key={opt.n}
                    onClick={() => go(opt.n)}
                    className={`w-full text-left ink-panel-sm px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                      opt.n === episode
                        ? "bg-accent text-accent-foreground font-bold ring-1 ring-accent"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold opacity-75">
                          {String(opt.n).padStart(2, "0")}
                        </span>
                        <span className="truncate text-sm">{opt.label}</span>
                        {opt.filler && (
                          <span className="border border-border px-1.5 py-0.2 font-mono text-[9px] uppercase">
                            Filler
                          </span>
                        )}
                      </div>
                      <p className="truncate font-mono text-[10px] opacity-60 mt-0.5">
                        {opt.jpTitle?.trim() || "Japanese title unavailable"}
                      </p>
                    </div>
                    {opt.aired && (
                      <span className="shrink-0 font-mono text-[10px] opacity-70">
                        {new Date(opt.aired).toLocaleDateString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            );
          }

          return (
            <div className="grid max-h-[400px] grid-cols-4 gap-2 overflow-y-auto sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
              {filtered.map((opt) => (
                <button
                  key={opt.n}
                  onClick={() => go(opt.n)}
                  className={`ink-panel-sm p-3 font-mono text-xs font-bold transition-all hover:scale-105 ${
                    opt.n === episode
                      ? "bg-accent text-accent-foreground ring-2 ring-accent ring-offset-2 ring-offset-background"
                      : "bg-card hover:bg-muted"
                  }`}
                  title={`${opt.n}. ${opt.label}`}
                >
                  {opt.n}
                </button>
              ))}
            </div>
          );
        })()}
      </div>

      <p className="flex items-start gap-2 font-mono text-[11px] text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" strokeWidth={2.5} />
        Video is played through an authorised third-party embed. AnimeHub hosts no video files.
      </p>
    </div>
  );
}
