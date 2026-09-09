import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { genresQuery, searchQuery } from "@/lib/jikan";
import { AnimeCard } from "@/components/AnimeCard";
import { CardSkeletonGrid, EmptyState, ErrorState } from "@/components/states";

type BrowseSearch = { genre: string; type: string; order: string; page: number };

export const Route = createFileRoute("/browse")({
  validateSearch: (search: Record<string, unknown>): BrowseSearch => ({
    genre: typeof search["genre"] === "string" ? search["genre"] : "",
    type: typeof search["type"] === "string" ? search["type"] : "",
    order: typeof search["order"] === "string" ? search["order"] : "popularity",
    page: Number(search["page"]) > 0 ? Number(search["page"]) : 1,
  }),
  head: () => ({
    meta: [
      { title: "Browse anime by genre and type — AnimeHub" },
      {
        name: "description",
        content:
          "Filter the anime catalogue by genre, format and ranking. Save anything you like to your watchlist.",
      },
      { property: "og:title", content: "Browse anime — AnimeHub" },
      {
        property: "og:description",
        content: "Filter thousands of anime by genre, format and popularity.",
      },
    ],
  }),
  component: BrowsePage,
});

const TYPES = [
  { value: "", label: "All" },
  { value: "tv", label: "TV" },
  { value: "movie", label: "Movie" },
  { value: "ova", label: "OVA" },
  { value: "special", label: "Special" },
];

const ORDERS = [
  { value: "popularity", label: "Popular" },
  { value: "score", label: "Top rated" },
  { value: "start_date", label: "Newest" },
  { value: "title", label: "A–Z" },
];

function BrowsePage() {
  const { genre, type, order, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/browse" });
  const genres = useQuery(genresQuery());
  const results = useQuery(searchQuery({ genre, type, orderBy: order, page, limit: 24 }));

  const update = (patch: Partial<BrowseSearch>) =>
    navigate({ search: (prev) => ({ ...prev, page: 1, ...patch }) });

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Browse the catalogue</h1>
      <p className="mt-2 max-w-[52ch] text-sm text-muted-foreground">
        Filter by genre and format. Everything links out to official sources — AnimeHub never hosts
        episodes.
      </p>

      <div className="ink-panel mt-6 space-y-4 p-4">
        <div>
          <p className="font-mono text-[11px] font-bold tracking-widest uppercase">Format</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => update({ type: t.value })}
                className={`border-2 border-border px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase ${
                  type === t.value ? "bg-accent text-accent-foreground" : "bg-card"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] font-bold tracking-widest uppercase">Sort by</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ORDERS.map((o) => (
              <button
                key={o.value}
                onClick={() => update({ order: o.value })}
                className={`border-2 border-border px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase ${
                  order === o.value ? "bg-accent text-accent-foreground" : "bg-card"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="font-mono text-[11px] font-bold tracking-widest uppercase">Genre</p>
          {genres.isPending ? (
            <div className="mt-2 h-8 w-full animate-pulse bg-muted" />
          ) : genres.isError ? (
            <p className="mt-2 text-sm text-accent">Genres couldn't be loaded.</p>
          ) : (
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                onClick={() => update({ genre: "" })}
                className={`border-2 border-border px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase ${
                  genre === "" ? "bg-accent text-accent-foreground" : "bg-card"
                }`}
              >
                All
              </button>
              {genres.data.slice(0, 20).map((g) => (
                <button
                  key={g.mal_id}
                  onClick={() => update({ genre: String(g.mal_id) })}
                  className={`border-2 border-border px-3 py-1.5 font-mono text-[11px] font-bold tracking-widest uppercase ${
                    genre === String(g.mal_id) ? "bg-accent text-accent-foreground" : "bg-card"
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8">
        {results.isPending ? (
          <CardSkeletonGrid />
        ) : results.isError ? (
          <ErrorState
            message="We couldn't load these results. The catalogue may be rate-limited — try again."
            onRetry={() => results.refetch()}
          />
        ) : results.data.items.length === 0 ? (
          <EmptyState
            title="No titles match"
            message="Try a different genre, format or sort order."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {results.data.items.map((anime) => (
                <AnimeCard key={anime.mal_id} anime={anime} />
              ))}
            </div>
            <div className="mt-10 flex items-center justify-center gap-3">
              <button
                disabled={page <= 1}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: page - 1 }) })}
                className="ink-panel-sm bg-card px-4 py-2 font-mono text-[11px] font-bold tracking-widest uppercase disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="font-mono text-[11px] tracking-widest uppercase">
                Page {page} / {results.data.pagination?.last_visible_page ?? page}
              </span>
              <button
                disabled={!results.data.pagination?.has_next_page}
                onClick={() => navigate({ search: (prev) => ({ ...prev, page: page + 1 }) })}
                className="ink-panel-sm bg-card px-4 py-2 font-mono text-[11px] font-bold tracking-widest uppercase disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
