import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  STATUS_LABELS,
  removeFromWatchlist,
  setWatchlistStatus,
  watchlistQuery,
  type WatchStatus,
} from "@/lib/library";
import { CardSkeletonGrid, EmptyState, ErrorState } from "@/components/states";

export const Route = createFileRoute("/_authenticated/watchlist")({
  head: () => ({
    meta: [
      { title: "My watchlist — AnimeHub" },
      {
        name: "description",
        content: "Every anime you've saved, grouped by whether you're planning, watching or done.",
      },
      { property: "og:title", content: "My watchlist — AnimeHub" },
      { property: "og:description", content: "Your saved anime and viewing status." },
    ],
  }),
  component: WatchlistPage,
});

const STATUSES: WatchStatus[] = ["planned", "watching", "completed", "on_hold", "dropped"];

const FILTERS: { key: "all" | WatchStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "planned", label: "Plan to watch" },
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
];

function WatchlistPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery(watchlistQuery(user?.id));
  const [filter, setFilter] = useState<"all" | WatchStatus>("all");
  const rows = (list.data ?? []).filter((r) => filter === "all" || r.status === filter);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });

  const statusMutation = useMutation({
    mutationFn: ({ malId, status }: { malId: number; status: WatchStatus }) =>
      setWatchlistStatus(user!.id, malId, status),
    onSuccess: () => {
      invalidate();
      toast.success("Status updated");
    },
    onError: () => toast.error("Couldn't update that. Please try again."),
  });

  const removeMutation = useMutation({
    mutationFn: (malId: number) => removeFromWatchlist(user!.id, malId),
    onSuccess: () => {
      invalidate();
      toast.success("Removed from your watchlist");
    },
    onError: () => toast.error("Couldn't remove that. Please try again."),
  });

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl tracking-tight sm:text-4xl">My watchlist</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {list.data
          ? `${list.data.length} saved title${list.data.length === 1 ? "" : "s"}`
          : "\u00a0"}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`ink-panel-sm px-3 py-2 font-mono text-[10px] font-bold tracking-widest uppercase ${
              filter === f.key ? "bg-accent text-accent-foreground" : "bg-card"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {list.isPending ? (
          <CardSkeletonGrid count={6} />
        ) : list.isError ? (
          <ErrorState message="Your watchlist couldn't be loaded." onRetry={() => list.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Your watchlist is empty"
            message="Start building your anime collection."
            action={
              <Link
                to="/browse"
                search={{ genre: "", type: "", order: "popularity", page: 1 }}
                className="ink-panel-sm ink-press bg-accent px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
              >
                Browse anime
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <div key={row.id} className="ink-panel flex gap-4 p-3">
                <Link
                  to="/anime/$animeId"
                  params={{ animeId: String(row.mal_id) }}
                  className="shrink-0"
                >
                  {row.image_url ? (
                    <img
                      src={row.image_url}
                      alt={row.title}
                      loading="lazy"
                      className="aspect-2/3 w-20 border-2 border-border object-cover"
                    />
                  ) : (
                    <div className="aspect-2/3 w-20 border-2 border-border bg-muted" />
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link to="/anime/$animeId" params={{ animeId: String(row.mal_id) }}>
                    <p className="line-clamp-2 font-display text-sm leading-tight">{row.title}</p>
                  </Link>
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {[row.media_type, row.year, row.score ? `★ ${row.score}` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <div className="mt-auto flex items-end gap-2 pt-3">
                    <select
                      value={row.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          malId: row.mal_id,
                          status: e.target.value as WatchStatus,
                        })
                      }
                      aria-label={`Status for ${row.title}`}
                      className="min-w-0 flex-1 border-2 border-border bg-card px-2 py-1.5 font-mono text-[10px] tracking-widest uppercase"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeMutation.mutate(row.mal_id)}
                      aria-label={`Remove ${row.title}`}
                      className="shrink-0 border-2 border-border bg-card p-1.5 hover:bg-accent hover:text-accent-foreground"
                    >
                      <Trash2 className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
