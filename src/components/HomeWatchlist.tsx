import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { removeFromWatchlist, watchlistQuery, type WatchlistRow } from "@/lib/library";
import { Button } from "@/components/ui/button";
import { CardSkeletonRow, EmptyState, ErrorState } from "@/components/states";

function SavedAnimeCard({
  row,
  onRemove,
  removing,
}: {
  row: WatchlistRow;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <article className="w-[250px] shrink-0 ink-panel-sm bg-card p-3 sm:w-[290px]">
      <div className="flex gap-3">
        <Link
          to="/anime/$animeId"
          params={{ animeId: String(row.mal_id) }}
          className="shrink-0"
          aria-label={row.title}
        >
          {row.image_url ? (
            <img
              src={row.image_url}
              alt={`${row.title} poster art`}
              loading="lazy"
              className="aspect-2/3 w-20 border-2 border-border object-cover"
            />
          ) : (
            <div className="grid aspect-2/3 w-20 place-items-center border-2 border-border bg-muted">
              <span className="font-mono text-[9px] tracking-widest uppercase">No art</span>
            </div>
          )}
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link to="/anime/$animeId" params={{ animeId: String(row.mal_id) }}>
            <h3 className="line-clamp-2 font-display text-sm leading-tight">{row.title}</h3>
          </Link>
          <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {[row.media_type, row.year].filter(Boolean).join(" · ") || "Saved anime"}
          </p>
          <div className="mt-auto flex items-center gap-2 pt-3">
            <Link
              to="/watch/$animeId/$episodeNumber"
              params={{ animeId: String(row.mal_id), episodeNumber: "1" }}
              className="ink-panel-sm ink-press inline-flex items-center gap-1.5 bg-accent px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
            >
              <Play className="size-3" fill="currentColor" strokeWidth={3} /> Watch
            </Link>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={removing}
              onClick={onRemove}
              aria-label={`Remove ${row.title} from watchlist`}
              title="Remove from watchlist"
              className="ink-panel-sm size-8 rounded-none border-2 bg-card p-0 hover:bg-accent hover:text-accent-foreground"
            >
              <Trash2 className="size-3.5" strokeWidth={2.5} />
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function HomeWatchlist() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery(watchlistQuery(user?.id));

  const removeMutation = useMutation({
    mutationFn: async (malId: number) => {
      if (!user) throw new Error("Sign in required");
      await removeFromWatchlist(user.id, malId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchlist", user?.id] });
      toast.success("Removed from your watchlist");
    },
    onError: (error) =>
      toast.error(`Couldn't update your watchlist: ${error.message || "Please try again."}`),
  });

  if (!user) return null;

  return (
    <section className="pt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-display text-xl tracking-tight sm:text-2xl">My watchlist</h2>
        <Link
          to="/watchlist"
          className="shrink-0 font-mono text-[11px] font-bold tracking-widest uppercase hover:text-accent"
        >
          View watchlist →
        </Link>
      </div>
      {list.isPending ? (
        <CardSkeletonRow count={4} />
      ) : list.isError ? (
        <ErrorState
          message={`Your watchlist couldn't be loaded: ${list.error.message}`}
          onRetry={() => list.refetch()}
        />
      ) : list.data.length === 0 ? (
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
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-3">
          {list.data.slice(0, 8).map((row) => (
            <SavedAnimeCard
              key={row.id}
              row={row}
              removing={removeMutation.isPending && removeMutation.variables === row.mal_id}
              onRemove={() => removeMutation.mutate(row.mal_id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

