import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Play, Star } from "lucide-react";
import { toast } from "sonner";
import {
  animeQuery,
  charactersQuery,
  episodesQuery,
  legalSources,
  posterOf,
  recommendationsQuery,
} from "@/lib/jikan";
import { AnimeCard } from "@/components/AnimeCard";
import { WatchlistButton } from "@/components/WatchlistButton";
import { CardSkeletonRow, EmptyState, ErrorState, PanelSkeleton } from "@/components/states";
import { useAuth } from "@/hooks/useAuth";
import { recordProgress } from "@/lib/library";

export const Route = createFileRoute("/anime/$animeId")({
  head: () => {
    const description =
      "Synopsis, cast, studios, characters, episodes and official viewing links for this anime.";
    return {
      meta: [
        { title: "Anime details — AnimeHub" },
        { name: "description", content: description },
        { property: "og:title", content: "Anime details — AnimeHub" },
        { property: "og:description", content: description },
        { property: "og:type", content: "video.tv_show" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: AnimeDetailPage,
  errorComponent: () => <NotFoundPanel />,
  notFoundComponent: () => <NotFoundPanel />,
});

const BROWSE_SEARCH = { genre: "", type: "", order: "popularity", page: 1 } as const;

function BackToBrowse() {
  return (
    <Link
      to="/browse"
      search={BROWSE_SEARCH}
      className="ink-panel-sm ink-press inline-block bg-card px-5 py-2.5 font-mono text-xs font-bold tracking-widest uppercase"
    >
      ← Back to browse
    </Link>
  );
}

function NotFoundPanel() {
  return (
    <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
      <div className="ink-panel halftone p-8 text-center">
        <p className="font-display text-2xl text-accent sm:text-3xl">Anime not found</p>
        <p className="mx-auto mt-3 max-w-[46ch] text-sm text-muted-foreground">
          We couldn't load this title. It may not exist, or the anime database is temporarily
          unavailable.
        </p>
        <div className="mt-6 flex justify-center">
          <BackToBrowse />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-border bg-card p-3">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-sm break-words">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b-2 border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="w-36 shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-sm break-words">{value || "—"}</span>
    </div>
  );
}

function AnimeDetailPage() {
  const { animeId } = Route.useParams();
  const id = Number(animeId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const anime = useQuery(animeQuery(id));

  const pageTitle = anime.data ? anime.data.title_english || anime.data.title : null;
  useEffect(() => {
    if (pageTitle) document.title = `${pageTitle} — AnimeHub`;
  }, [pageTitle]);
  const recommendations = useQuery({ ...recommendationsQuery(id), enabled: anime.isSuccess });
  // Auto-load episodes when anime data is available
  const episodes = useQuery({ ...episodesQuery(id), enabled: anime.isSuccess });

  const markWatched = useMutation({
    mutationFn: async () => {
      if (!user || !anime.data) throw new Error("not-signed-in");
      await recordProgress(user.id, anime.data, anime.data.episodes ?? 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Marked as watched");
    },
    onError: () => toast.error("Sign in to track your progress."),
  });

  if (anime.isPending) {
    return (
      <div className="mx-auto max-w-[1500px] space-y-10 px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <PanelSkeleton className="aspect-2/3 w-full max-w-[300px] lg:col-span-4" />
          <div className="space-y-4 lg:col-span-8">
            <div className="h-12 w-3/4 animate-pulse bg-muted" />
            <div className="h-32 w-full animate-pulse bg-muted" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <PanelSkeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
        <PanelSkeleton className="h-64 w-full" />
        <CardSkeletonRow count={6} />
      </div>
    );
  }

  if (anime.isError || !anime.data) {
    return <NotFoundPanel />;
  }

  const data = anime.data;
  const title = data.title_english || data.title;
  const poster = posterOf(data, true);
  const sources = legalSources(data);
  const relatedEntries = (data.relations ?? [])
    .flatMap((r) =>
      r.entry
        .filter((e) => e.type === "anime" && e.mal_id !== data.mal_id)
        .map((e) => ({ ...e, relation: r.relation })),
    )
    .filter((e, i, arr) => arr.findIndex((x) => x.mal_id === e.mal_id) === i);
  // Episode metadata is lazy; fall back to episode 1 when it isn't loaded yet.
  const firstEpisode = episodes.data?.[0]?.mal_id ?? 1;

  return (
    <article className="overflow-x-hidden">
      <header className="speed-lines border-b-[3px] border-border">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-12">
          <div className="lg:col-span-4">
            <div className="ink-panel halftone mx-auto max-w-[300px] p-2.5">
              {poster ? (
                <img
                  src={poster}
                  alt={`${title} poster`}
                  className="aspect-2/3 w-full object-cover"
                />
              ) : (
                <div className="grid aspect-2/3 place-items-center bg-muted font-mono text-xs uppercase">
                  No art
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 lg:col-span-8">
            <h1 className="font-display text-3xl leading-[1] break-words sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {data.title_japanese && (
              <p className="mt-2 font-mono text-xs tracking-widest text-muted-foreground">
                {data.title_japanese}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
              {typeof data.score === "number" && (
                <span className="border-2 border-border bg-accent px-2.5 py-1 text-accent-foreground">
                  <Star className="mr-1 inline size-3 -translate-y-px" strokeWidth={3} />
                  {data.score.toFixed(2)}
                </span>
              )}
              {[data.type, data.status, data.rating?.split(" ")[0]].filter(Boolean).map((chip) => (
                <span key={String(chip)} className="border-2 border-border px-2.5 py-1">
                  {chip}
                </span>
              ))}
            </div>

            <p className="mt-5 max-w-[70ch] line-clamp-6 text-sm text-pretty sm:text-base">
              {data.synopsis ?? "No synopsis available for this title yet."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/watch/$animeId/$episodeNumber"
                params={{ animeId: String(data.mal_id), episodeNumber: String(firstEpisode) }}
                className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
              >
                <Play className="size-4" strokeWidth={3} /> Watch now
              </Link>
              <WatchlistButton anime={data} />
              <button
                onClick={() => markWatched.mutate()}
                disabled={markWatched.isPending}
                className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-card px-5 py-3 font-mono text-xs font-bold tracking-widest uppercase"
              >
                <CheckCircle2 className="size-4" strokeWidth={2.5} /> Mark as watched
              </button>
              {sources[0] ? (
                <a
                  href={sources[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
                >
                  Official source <ExternalLink className="size-3.5" strokeWidth={3} />
                </a>
              ) : (
                data.url && (
                  <a
                    href={data.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-card px-5 py-3 font-mono text-xs font-bold tracking-widest uppercase"
                  >
                    View on MyAnimeList <ExternalLink className="size-3.5" strokeWidth={3} />
                  </a>
                )
              )}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Stat label="Score" value={data.score ? data.score.toFixed(2) : "—"} />
              <Stat label="Rank" value={data.rank ? `#${data.rank}` : "—"} />
              <Stat label="Popularity" value={data.popularity ? `#${data.popularity}` : "—"} />
              <Stat label="Episodes" value={data.episodes ? String(data.episodes) : "Unknown"} />
              <Stat label="Type" value={data.type ?? "—"} />
              <Stat label="Year" value={data.year ? String(data.year) : "—"} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-12 px-4 py-10 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="ink-panel lg:col-span-2">
            <h2 className="border-b-2 border-border px-4 py-3 font-display text-lg">Information</h2>
            <InfoRow label="Japanese title" value={data.title_japanese ?? ""} />
            <InfoRow label="English title" value={data.title_english ?? ""} />
            <InfoRow label="Synonyms" value={(data.title_synonyms ?? []).join(", ")} />
            <InfoRow label="Type" value={data.type ?? ""} />
            <InfoRow label="Episodes" value={data.episodes ? String(data.episodes) : ""} />
            <InfoRow label="Status" value={data.status ?? ""} />
            <InfoRow label="Aired" value={data.aired?.string ?? ""} />
            <InfoRow label="Duration" value={data.duration ?? ""} />
            <InfoRow label="Rating" value={data.rating ?? ""} />
            <InfoRow
              label="Score"
              value={data.score ? `${data.score.toFixed(2)} (${data.scored_by ?? 0} votes)` : ""}
            />
            <InfoRow label="Rank" value={data.rank ? `#${data.rank}` : ""} />
            <InfoRow label="Popularity" value={data.popularity ? `#${data.popularity}` : ""} />
            <InfoRow label="Season" value={[data.season, data.year].filter(Boolean).join(" ")} />
            <InfoRow label="Source" value={data.source ?? ""} />
          </div>

          <div className="space-y-6">
            <div className="ink-panel p-5">
              <h2 className="font-display text-lg">Genres</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {(data.genres ?? []).concat(data.themes ?? []).map((g) => (
                  <span
                    key={`${g.mal_id}-${g.name}`}
                    className="border-2 border-border px-2.5 py-1 font-mono text-[10px] tracking-widest uppercase"
                  >
                    {g.name}
                  </span>
                ))}
                {(data.genres ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No genres listed.</p>
                )}
              </div>
            </div>
            <div className="ink-panel p-5">
              <h2 className="font-display text-lg">Studios &amp; producers</h2>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Studios
                  </dt>
                  <dd>{(data.studios ?? []).map((s) => s.name).join(", ") || "Not listed."}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Producers
                  </dt>
                  <dd>{(data.producers ?? []).map((s) => s.name).join(", ") || "Not listed."}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    Licensors
                  </dt>
                  <dd>{(data.licensors ?? []).map((s) => s.name).join(", ") || "Not listed."}</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="ink-panel halftone p-5 sm:p-6">
          <h2 className="font-display text-xl sm:text-2xl">Story</h2>
          <p className="mt-3 max-w-[75ch] text-sm whitespace-pre-line text-pretty sm:text-base">
            {data.synopsis ?? "No synopsis available for this title yet."}
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl sm:text-2xl">Episodes</h2>
          {episodes.isPending ? (
            <PanelSkeleton className="h-40 w-full" />
          ) : episodes.isError ? (
            <ErrorState
              message="Episode list couldn't be loaded."
              onRetry={() => episodes.refetch()}
            />
          ) : episodes.data.length === 0 ? (
            <EmptyState
              title="No episode list"
              message="This title has no published episode information — it may be a movie or not yet aired."
            />
          ) : (
            <>
              {typeof data.episodes === "number" && data.episodes > episodes.data.length && (
                <p className="mb-3 border-2 border-border bg-card px-3 py-2 font-mono text-[10px] tracking-wide uppercase">
                  Showing {episodes.data.length} of {data.episodes} episodes — the database has no
                  published entries for the rest yet.{" "}
                  <button
                    type="button"
                    onClick={() => episodes.refetch()}
                    className="underline underline-offset-2"
                  >
                    Retry
                  </button>
                </p>
              )}
              <div className="ink-panel max-h-[420px] overflow-y-auto">
                <ul>
                  {episodes.data.map((ep) => (
                    <li
                      key={ep.mal_id}
                      className="flex flex-wrap items-center gap-3 border-b-2 border-border px-4 py-3 last:border-b-0"
                    >
                      <span className="w-10 shrink-0 font-mono text-xs font-bold">
                        {String(ep.mal_id).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm">{ep.title}</span>
                        {ep.title_japanese && (
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">
                            {ep.title_japanese}
                          </span>
                        )}
                      </span>
                      {ep.aired && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          {new Date(ep.aired).toLocaleDateString()}
                        </span>
                      )}
                      {ep.filler && (
                        <span className="shrink-0 border-2 border-border px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase">
                          Filler
                        </span>
                      )}
                      <Link
                        to="/watch/$animeId/$episodeNumber"
                        params={{ animeId: String(data.mal_id), episodeNumber: String(ep.mal_id) }}
                        className="ink-panel-sm ink-press shrink-0 bg-card px-3 py-1 font-mono text-[10px] font-bold tracking-widest uppercase"
                      >
                        Watch
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl sm:text-2xl">Where to watch</h2>
          <h3 className="mb-3 font-mono text-[11px] font-bold tracking-widest uppercase">
            Watch on AnimeHub
          </h3>
          <Link
            to="/watch/$animeId/$episodeNumber"
            params={{
              animeId: String(data.mal_id),
              episodeNumber: String(episodes.data?.[0]?.mal_id ?? 1),
            }}
            className="ink-panel-sm ink-press mb-6 inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            Open watch page
          </Link>
          <h3 className="mb-3 font-mono text-[11px] font-bold tracking-widest uppercase">
            Official platforms
          </h3>
          {sources.length === 0 ? (
            <EmptyState
              title="No official links listed"
              message="We only link to licensed platforms. None are listed for this title yet."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sources.map((s) => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ink-panel-sm ink-press flex items-center justify-between gap-3 bg-card px-4 py-3"
                >
                  <span className="truncate font-display text-sm">{s.name}</span>
                  <ExternalLink className="size-4 shrink-0" strokeWidth={2.5} />
                </a>
              ))}
            </div>
          )}
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            AnimeHub playback uses authorized embedded sources. External links go only to official
            platforms listed for this title.
          </p>
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl sm:text-2xl">Related anime</h2>
          {recommendations.isPending ? (
            <CardSkeletonRow count={6} />
          ) : recommendations.isError ? (
            <ErrorState
              message="Recommendations couldn't be loaded."
              onRetry={() => recommendations.refetch()}
            />
          ) : recommendations.data.length === 0 ? (
            relatedEntries.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relatedEntries.map((r) => (
                  <Link
                    key={r.mal_id}
                    to="/anime/$animeId"
                    params={{ animeId: String(r.mal_id) }}
                    className="ink-panel-sm ink-press bg-card px-4 py-3"
                  >
                    <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                      {r.relation}
                    </p>
                    <p className="truncate font-display text-sm">{r.name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No recommendations yet"
                message="We couldn't find related titles for this anime."
              />
            )
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {recommendations.data.map((rec) => (
                <AnimeCard key={rec.mal_id} anime={rec} />
              ))}
            </div>
          )}
        </section>

        <div>
          <BackToBrowse />
        </div>
      </div>
    </article>
  );
}
