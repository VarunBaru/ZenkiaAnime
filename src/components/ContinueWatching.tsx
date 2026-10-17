import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteHistoryEntry,
  formatClock,
  formatWatchedAt,
  historyQuery,
  latestPerAnime,
  type HistoryRow,
} from "@/lib/library";
import { CardSkeletonRow } from "@/components/states";
import { Button } from "@/components/ui/button";

/** Real timeline progress only — rows without saved player data show nothing. */
export function ProgressLine({ row }: { row: HistoryRow }) {
  const pos = row.progress_seconds;
  const dur = row.duration_seconds;
  if (pos == null || !dur || dur <= 0) return null;
  const pct = Math.round(row.completed ? 100 : (row.progress_percent ?? (pos / dur) * 100));
  return (
    <div className="my-1.5">
      <div
        className="h-2 w-full border-2 border-border bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Episode progress"
      >
        <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground tabular-nums">
        {pct}% · {formatClock(pos)} / {formatClock(dur)}
      </p>
    </div>
  );
}

export function HistoryCard({
  row,
  actions,
}: {
  row: HistoryRow & { episode_number?: number | null };
  actions?: React.ReactNode;
}) {
  const episode = row.episode_number ?? row.episodes_watched ?? 1;
  return (
    <article className="ink-panel-sm flex gap-3 bg-card p-3">
      <Link
        to="/anime/$animeId"
        params={{ animeId: String(row.mal_id) }}
        className="shrink-0"
        aria-label={row.title}
      >
        {row.image_url ? (
          <img
            src={row.image_url}
            alt={row.title}
            loading="lazy"
            className="aspect-2/3 w-16 border-2 border-border object-cover sm:w-20"
          />
        ) : (
          <div className="aspect-2/3 w-16 border-2 border-border bg-muted sm:w-20" />
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 font-display text-sm sm:text-base">{row.title}</p>
        <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          Episode {episode}
          {row.completed ? " · Completed" : ""}
        </p>
        <ProgressLine row={row} />
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {formatWatchedAt(row.last_watched_at)}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Link
            to="/watch/$animeId/$episodeNumber"
            params={{ animeId: String(row.mal_id), episodeNumber: String(episode) }}
            className="ink-panel-sm ink-press bg-accent px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
          >
            Continue watching
          </Link>
          {actions}
        </div>
      </div>
    </article>
  );
}

export function ContinueWatching() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const history = useQuery(historyQuery(user?.id));

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Sign in required");
      await deleteHistoryEntry(user.id, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["history"] });
      toast.success("Removed from watch history");
    },
    onError: () => toast.error("Couldn't remove that history item. Please try again."),
  });

  if (!user) return null;
  if (history.isPending) {
    return (
      <section className="pt-10">
        <h2 className="mb-4 font-display text-xl tracking-tight sm:text-2xl">Continue watching</h2>
        <CardSkeletonRow count={4} />
      </section>
    );
  }
  if (history.isError || !history.data || history.data.length === 0) return null;

  return (
    <section className="pt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-display text-xl tracking-tight sm:text-2xl">Continue watching</h2>
        <Link
          to="/history"
          className="shrink-0 font-mono text-[11px] font-bold tracking-widest uppercase hover:text-accent"
        >
          View history →
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {latestPerAnime(history.data)
          .slice(0, 6)
          .map((row) => (
            <HistoryCard
              key={row.id}
              row={row}
              actions={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={removeMutation.isPending && removeMutation.variables === row.id}
                  onClick={() => {
                    if (window.confirm(`Remove ${row.title} from your watch history?`)) {
                      removeMutation.mutate(row.id);
                    }
                  }}
                  aria-label={`Remove ${row.title} from watch history`}
                  title="Remove from watch history"
                  className="ink-panel-sm size-8 rounded-none border-2 bg-card p-0 hover:bg-accent hover:text-accent-foreground"
                >
                  <Trash2 className="size-3.5" strokeWidth={2.5} />
                </Button>
              }
            />
          ))}
      </div>
    </section>
  );
}
