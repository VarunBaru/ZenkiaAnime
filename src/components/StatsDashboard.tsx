import { BookMarked, Clock, Film, Heart, Play, Star, TrendingUp } from "lucide-react";
import { CardSkeletonRow } from "@/components/states";
import type { WatchlistRow, HistoryRow, FavoriteRow } from "@/lib/library";
import { profileStats } from "@/lib/library";

function StatCard({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  accent?: boolean;
}) {
  return (
    <div
      className={`ink-panel-sm halftone flex min-w-0 flex-col items-start gap-2 p-3 sm:flex-row sm:items-center sm:gap-3 sm:p-4 ${
        accent ? "border-accent/60" : ""
      }`}
    >
      <div
        className={`grid size-9 shrink-0 place-items-center border-2 sm:size-11 ${
          accent ? "border-accent bg-accent text-accent-foreground" : "border-border bg-card"
        }`}
      >
        {Icon}
      </div>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
          {label}
        </p>
        <p className="break-words font-display text-lg sm:text-xl">{value}</p>
      </div>
    </div>
  );
}

export function StatsDashboard({
  watchlist,
  history,
  favorites,
  isPending,
}: {
  watchlist: WatchlistRow[];
  history: HistoryRow[];
  favorites: FavoriteRow[];
  isPending: boolean;
}) {
  const display = profileStats(watchlist, history, favorites);

  if (isPending) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeletonRow key={i} count={1} />
        ))}
      </div>
    );
  }

  const watchHours = Math.floor(display.watchMinutes / 60);
  const watchMins = display.watchMinutes % 60;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={<BookMarked className="size-4" />}
          label="Anime watched"
          value={display.totalAnimes}
        />
        <StatCard
          icon={<Film className="size-4" />}
          label="Episodes"
          value={display.episodesWatched}
        />
        <StatCard
          icon={<Play className="size-4" />}
          label="Completed series"
          value={display.completedSeries}
        />
        <StatCard
          icon={<Heart className="size-4" />}
          label="Favorites"
          value={display.favoritesCount}
          accent
        />
        <StatCard
          icon={<Clock className="size-4" />}
          label="Watch time"
          value={`${watchHours}h ${watchMins}m`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Watching"
          value={display.watchingSeries}
        />
        <StatCard
          icon={<Star className="size-4" />}
          label="Completed episodes"
          value={display.completedEpisodes}
        />
        <StatCard
          icon={<BookMarked className="size-4" />}
          label="Plan to watch"
          value={display.plannedSeries}
        />
        <StatCard icon={<Film className="size-4" />} label="On hold" value={display.onHoldSeries} />
      </div>
    </div>
  );
}
