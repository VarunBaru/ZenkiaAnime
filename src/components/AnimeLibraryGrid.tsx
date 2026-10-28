import { Link } from "@tanstack/react-router";
import { Heart, Trash2 } from "lucide-react";
import { CardSkeletonGrid, EmptyState } from "@/components/states";
import type { WatchlistRow, HistoryRow } from "@/lib/library";

export type LibrarySection =
  "favorites" | "watching" | "completed" | "on_hold" | "planned" | "dropped";

const SECTION_LABELS: Record<LibrarySection, string> = {
  favorites: "Favorites",
  watching: "Currently Watching",
  completed: "Completed",
  on_hold: "On Hold",
  planned: "Plan to Watch",
  dropped: "Dropped",
};

function LibraryRow({
  row,
  onRemove,
  isFavorite = false,
  onToggleFavorite,
  historyRow,
  onStatus,
}: {
  row: WatchlistRow;
  onRemove: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  historyRow?: HistoryRow | undefined;
  onStatus: (status: WatchlistRow["status"]) => void;
}) {
  const percent = Math.round(historyRow?.progress_percent ?? 0);
  const progress = historyRow
    ? `Episode ${historyRow.episode_number ?? 1}${historyRow.total_episodes ? ` / ${historyRow.total_episodes}` : ""}`
    : row.status === "completed"
      ? "Completed"
      : "No episode progress";
  return (
    <div className="ink-panel-sm flex flex-col gap-3 bg-card p-3">
      <div className="flex items-start gap-3">
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
              className="aspect-2/3 w-14 border-2 border-border object-cover"
            />
          ) : (
            <div className="aspect-2/3 w-14 border-2 border-border bg-muted" />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to="/anime/$animeId" params={{ animeId: String(row.mal_id) }}>
            <p className="line-clamp-2 font-display text-sm">{row.title}</p>
          </Link>
          <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {[row.media_type, row.year, row.score ? `★ ${row.score}` : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`p-1.5 transition-colors ${
                isFavorite ? "text-rose-400" : "text-muted-foreground hover:text-rose-400"
              }`}
            >
              <Heart
                className="size-4"
                strokeWidth={2.5}
                fill={isFavorite ? "currentColor" : "none"}
              />
            </button>
          )}
          <button
            onClick={onRemove}
            aria-label="Remove from library"
            className="p-1.5 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-2">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {progress}
          </span>
          {historyRow && (
            <div className="mt-1 h-1 bg-muted">
              <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
            </div>
          )}
        </div>
        <select
          aria-label={`Update ${row.title} status`}
          value={row.status}
          onChange={(event) => onStatus(event.target.value as WatchlistRow["status"])}
          className="max-w-24 bg-background px-1 py-1 font-mono text-[9px] uppercase"
        >
          <option value="watching">Watching</option>
          <option value="completed">Completed</option>
          <option value="planned">Plan</option>
          <option value="on_hold">Hold</option>
          <option value="dropped">Dropped</option>
        </select>
        <Link
          to="/anime/$animeId"
          params={{ animeId: String(row.mal_id) }}
          className="ink-panel-sm ink-press bg-accent px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-accent-foreground uppercase"
        >
          View
        </Link>
      </div>
    </div>
  );
}

export function AnimeLibraryGrid({
  section,
  rows,
  favorites,
  history,
  isPending,
  onRemove,
  onToggleFavorite,
  onStatus,
}: {
  section: LibrarySection;
  rows: WatchlistRow[];
  favorites: Set<number>;
  history: HistoryRow[];
  isPending: boolean;
  onRemove: (malId: number) => void;
  onToggleFavorite: (malId: number) => void;
  onStatus: (malId: number, status: WatchlistRow["status"]) => void;
}) {
  const filtered = rows.filter((r) => {
    if (section === "favorites") return favorites.has(r.mal_id);
    return r.status === section;
  });

  if (isPending) {
    return <CardSkeletonGrid count={6} />;
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="Nothing here yet"
        message={
          section === "favorites"
            ? "Tap the heart on any anime to add it to your favorites."
            : `No anime in your ${SECTION_LABELS[section].toLowerCase()} list.`
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {filtered.map((row) => (
        <LibraryRow
          key={row.id}
          row={row}
          isFavorite={favorites.has(row.mal_id)}
          onRemove={() => onRemove(row.mal_id)}
          onToggleFavorite={() => onToggleFavorite(row.mal_id)}
          historyRow={
            history
              .filter((item) => item.mal_id === row.mal_id)
              .sort(
                (a, b) =>
                  new Date(b.last_watched_at).getTime() - new Date(a.last_watched_at).getTime(),
              )[0]
          }
          onStatus={(status) => onStatus(row.mal_id, status)}
        />
      ))}
    </div>
  );
}
