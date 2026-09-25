import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { animeQuery, episodesQuery } from "@/lib/jikan";
import { anilistQuery, embedUrl } from "@/lib/anilist";
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
    const description = "Watch this episode on AnimeHub with an authorised embedded player.";
    return {
      meta: [
        { title: "Watch — AnimeHub" },
        { name: "description", content: description },
        { property: "og:title", content: "Watch — AnimeHub" },
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

  const anime = useQuery(animeQuery(id));
  const anilist = useQuery(anilistQuery(id));
  const episodes = useQuery({ ...episodesQuery(id), enabled: anime.isSuccess });
  const history = useQuery({ ...historyQuery(), enabled: Boolean(user) });

  const title = anime.data ? anime.data.title_english || anime.data.title : null;

  useEffect(() => {
    if (title) document.title = `${title} — Episode ${episode} — AnimeHub`;
  }, [title, episode]);

  useEffect(() => setFrameFailed(false), [id, episode]);

  // Episode-level history: one row per user + anime + episode.
  useEffect(() => {
    if (!user || !anime.data) return;
    recordEpisodeWatch(user.id, anime.data, episode)
      .then(() => queryClient.invalidateQueries({ queryKey: ["history"] }))
      .catch(() => undefined);
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
      { source: "aniembed", version: 1, type: "command", name, requestId: crypto.randomUUID(), data },
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
    };

    const onHide = () => save(true);
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

  const src = embedUrl(anilist.data.id, episode);
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
          <div className="relative aspect-video w-full bg-black">
            <iframe
              ref={iframeRef}
              key={src}
              src={src}
              title={`${title} episode ${episode}`}
              className="absolute inset-0 size-full"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="origin"
              onError={() => setFrameFailed(true)}
            />
          </div>
        )}
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
            const t = live?.t ?? (saved?.progress_seconds != null ? Number(saved.progress_seconds) : null);
            const d = live?.d ?? (saved?.duration_seconds != null ? Number(saved.duration_seconds) : null);
            if (t == null || !d) return null;
            const pct = Math.min(100, Math.round((t / d) * 100));
            return (
              <div className="space-y-1">
                <div className="h-2.5 w-full border-2 border-border bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Episode progress">
                  <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
                </div>
                <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase tabular-nums">
                  {live ? "Progress" : "Saved progress"} · {pct}% · {formatClock(t)} / {formatClock(d)}
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
          {currentEpisode?.title ? ` — ${currentEpisode.title}` : ""}
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

        <label className="ink-panel-sm flex items-center gap-2 bg-card px-3 py-2">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            Episode
          </span>
          <select
            value={episode}
            onChange={(e) => go(Number(e.target.value))}
            className="max-w-[16rem] bg-transparent font-mono text-xs font-bold outline-none"
          >
            {(totalFromList
              ? episodes.data!.map((ep, i) => ({ n: i + 1, label: ep.title }))
              : Array.from({ length: Math.max(total, episode) }, (_, i) => ({
                  n: i + 1,
                  label: "",
                }))
            ).map((opt) => (
              <option key={opt.n} value={opt.n}>
                {opt.n}
                {opt.label ? ` · ${opt.label}` : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="flex items-start gap-2 font-mono text-[11px] text-muted-foreground">
        <Info className="mt-px size-3.5 shrink-0" strokeWidth={2.5} />
        Video is played through an authorised third-party embed. AnimeHub hosts no video files.
      </p>
    </div>
  );
}
