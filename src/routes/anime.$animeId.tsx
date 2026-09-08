import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Star } from "lucide-react";
import { toast } from "sonner";
import {
  animeQuery,
  charactersQuery,
  episodesQuery,
  legalSources,
  posterOf,
} from "@/lib/jikan";
import { WatchlistButton } from "@/components/WatchlistButton";
import { CardSkeletonRow, EmptyState, ErrorState, PanelSkeleton } from "@/components/states";
import { useAuth } from "@/hooks/useAuth";
import { recordProgress } from "@/lib/library";

export const Route = createFileRoute("/anime/$animeId")({
  head: () => ({
    meta: [
      { title: "Anime details — AnimeHub" },
      {
        name: "description",
        content:
          "Full anime details: synopsis, rating, episodes, studios, genres, characters and official viewing links.",
      },
      { property: "og:title", content: "Anime details — AnimeHub" },
      {
        property: "og:description",
        content: "Synopsis, cast, studios and official viewing links for this anime.",
      },
    ],
  }),
  component: AnimeDetailPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-border bg-card p-3">
      <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-display text-sm break-words">{value}</p>
    </div>
  );
}

function AnimeDetailPage() {
  const { animeId } = Route.useParams();
  const id = Number(animeId);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const anime = useQuery(animeQuery(id));
  const characters = useQuery({ ...charactersQuery(id), enabled: anime.isSuccess });
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
      <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-12">
          <PanelSkeleton className="aspect-2/3 w-full max-w-[300px] lg:col-span-4" />
          <div className="space-y-4 lg:col-span-8">
            <div className="h-12 w-3/4 animate-pulse bg-muted" />
            <div className="h-32 w-full animate-pulse bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (anime.isError) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-16 sm:px-6">
        <ErrorState
          title="Couldn't load this title"
          message={anime.error instanceof Error ? anime.error.message : "Please try again."}
          onRetry={() => anime.refetch()}
        />
      </div>
    );
  }

  const data = anime.data;
  const title = data.title_english || data.title;
  const poster = posterOf(data, true);
  const sources = legalSources(data);

  return (
    <article>
      <header className="speed-lines border-b-[3px] border-border">
        <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-12">
          <div className="lg:col-span-4">
            <div className="ink-panel mx-auto max-w-[300px] p-2.5">
              {poster ? (
                <img src={poster} alt={`${title} poster`} className="aspect-2/3 w-full object-cover" />
              ) : (
                <div className="grid aspect-2/3 place-items-center bg-muted">No art</div>
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

            <p className="mt-5 max-w-[70ch] text-sm text-pretty sm:text-base">
              {data.synopsis ?? "No synopsis available for this title yet."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
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
                  Watch official source <ExternalLink className="size-3.5" strokeWidth={3} />
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

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Episodes" value={data.episodes ? String(data.episodes) : "Unknown"} />
              <Stat label="Duration" value={data.duration ?? "—"} />
              <Stat label="Aired" value={data.aired?.string ?? "—"} />
              <Stat label="Season" value={[data.season, data.year].filter(Boolean).join(" ") || "—"} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] space-y-12 px-4 py-10 sm:px-6">
        <section className="grid gap-6 lg:grid-cols-3">
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
            <h2 className="font-display text-lg">Studios</h2>
            <p className="mt-3 text-sm">
              {(data.studios ?? []).map((s) => s.name).join(", ") || "Not listed."}
            </p>
          </div>
          <div className="ink-panel p-5">
            <h2 className="font-display text-lg">Producers</h2>
            <p className="mt-3 text-sm">
              {(data.producers ?? []).map((s) => s.name).join(", ") || "Not listed."}
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl sm:text-2xl">Characters</h2>
          {characters.isPending ? (
            <CardSkeletonRow count={6} />
          ) : characters.isError ? (
            <ErrorState message="Characters couldn't be loaded." onRetry={() => characters.refetch()} />
          ) : characters.data.length === 0 ? (
            <EmptyState title="No characters listed" message="This title has no character data yet." />
          ) : (
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3">
              {characters.data.map((c) => {
                const img = c.character.images?.jpg?.image_url;
                return (
                  <div key={c.character.mal_id} className="w-[120px] shrink-0">
                    <div className="ink-panel-sm overflow-hidden">
                      {img ? (
                        <img
                          src={img}
                          alt={c.character.name}
                          loading="lazy"
                          className="aspect-2/3 w-full object-cover"
                        />
                      ) : (
                        <div className="aspect-2/3 bg-muted" />
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 font-display text-[11px] leading-tight">
                      {c.character.name}
                    </p>
                    <p className="font-mono text-[9px] tracking-widest text-muted-foreground uppercase">
                      {c.role}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl sm:text-2xl">Episodes</h2>
          {episodes.isPending ? (
            <PanelSkeleton className="h-40 w-full" />
          ) : episodes.isError ? (
            <ErrorState message="Episode list couldn't be loaded." onRetry={() => episodes.refetch()} />
          ) : episodes.data.length === 0 ? (
            <EmptyState
              title="No episode list"
              message="This title has no published episode information — it may be a movie or not yet aired."
            />
          ) : (
            <div className="ink-panel max-h-[420px] overflow-y-auto">
              <ul>
                {episodes.data.map((ep) => (
                  <li
                    key={ep.mal_id}
                    className="flex items-center gap-3 border-b-2 border-border px-4 py-3 last:border-b-0"
                  >
                    <span className="w-10 shrink-0 font-mono text-xs font-bold">
                      {String(ep.mal_id).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{ep.title}</span>
                    {ep.filler && (
                      <span className="shrink-0 border-2 border-border px-2 py-0.5 font-mono text-[9px] tracking-widest uppercase">
                        Filler
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl sm:text-2xl">Where to watch — official only</h2>
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
            AnimeHub is a catalogue. We never host or stream episodes, and we don't link to
            unofficial sources.
          </p>
        </section>

        <div>
          <Link
            to="/browse"
            search={{ genre: "", type: "", order: "popularity", page: 1 }}
            className="ink-panel-sm ink-press inline-block bg-card px-5 py-2.5 font-mono text-xs font-bold tracking-widest uppercase"
          >
            ← Back to browse
          </Link>
        </div>
      </div>
    </article>
  );
}
