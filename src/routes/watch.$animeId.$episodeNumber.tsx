import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import { animeQuery, episodesQuery } from "@/lib/jikan";
import { anilistQuery, embedUrl } from "@/lib/anilist";
import { ErrorState, PanelSkeleton } from "@/components/states";
import { useAuth } from "@/hooks/useAuth";
import { recordEpisodeWatch } from "@/lib/library";

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
  const { user } = useAuth();
  const [frameFailed, setFrameFailed] = useState(false);

  const anime = useQuery(animeQuery(id));
  const anilist = useQuery(anilistQuery(id));
  const episodes = useQuery({ ...episodesQuery(id), enabled: anime.isSuccess });

  const title = anime.data ? anime.data.title_english || anime.data.title : null;

  useEffect(() => {
    if (title) document.title = `${title} — Episode ${episode} — AnimeHub`;
  }, [title, episode]);

  useEffect(() => setFrameFailed(false), [id, episode]);

  // Watch history: one row per user + anime, updated as episodes are opened.
  useEffect(() => {
    if (!user || !anime.data) return;
    recordEpisodeWatch(user.id, anime.data, episode).catch(() => undefined);
  }, [user, anime.data, episode]);

  const totalFromList = episodes.data?.length ?? 0;
  const total = totalFromList || anime.data?.episodes || 0;
  const hasPrev = episode > 1;
  const hasNext = total ? episode < total : true;

  const go = (next: number) =>
    navigate({
      to: "/watch/$animeId/$episodeNumber",
      params: { animeId, episodeNumber: String(next) },
    });

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
