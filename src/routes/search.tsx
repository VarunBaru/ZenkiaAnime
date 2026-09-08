import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { searchQuery } from "@/lib/jikan";
import { AnimeCard } from "@/components/AnimeCard";
import { CardSkeletonGrid, EmptyState, ErrorState } from "@/components/states";

type SearchParams = { q: string; page: number };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : "",
    page: Number(search.page) > 0 ? Number(search.page) : 1,
  }),
  head: () => ({
    meta: [
      { title: "Search anime titles — AnimeHub" },
      {
        name: "description",
        content: "Search thousands of anime by title, then save results to your watchlist.",
      },
      { property: "og:title", content: "Search anime — AnimeHub" },
      { property: "og:description", content: "Find any anime by title in the AnimeHub catalogue." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, page } = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [term, setTerm] = useState(q);

  useEffect(() => setTerm(q), [q]);

  const results = useQuery({ ...searchQuery({ q, page, limit: 24 }), enabled: q.trim().length > 0 });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: { q: term.trim(), page: 1 } });
  };

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">Search</h1>

      <form onSubmit={submit} className="mt-6 flex max-w-[640px] items-center gap-2">
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Try “Frieren”, “mecha”, “Ghibli”…"
          aria-label="Search anime titles"
          className="ink-panel-sm w-full bg-card px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="ink-panel-sm ink-press shrink-0 bg-accent px-4 py-3 text-accent-foreground"
          aria-label="Search"
        >
          <SearchIcon className="size-4" strokeWidth={3} />
        </button>
      </form>

      <div className="mt-8">
        {q.trim().length === 0 ? (
          <EmptyState
            title="Start typing"
            message="Search the catalogue by title, studio or keyword to see results here."
          />
        ) : results.isPending ? (
          <CardSkeletonGrid />
        ) : results.isError ? (
          <ErrorState
            message="Search failed. The catalogue may be rate-limited — try again in a moment."
            onRetry={() => results.refetch()}
          />
        ) : results.data.items.length === 0 ? (
          <EmptyState
            title={`No results for “${q}”`}
            message="Check the spelling or try a shorter, more general term."
          />
        ) : (
          <>
            <p className="mb-4 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
              Results for “{q}”
            </p>
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
              <span className="font-mono text-[11px] tracking-widest uppercase">Page {page}</span>
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
