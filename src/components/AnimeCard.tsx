import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import type { Anime } from "@/lib/jikan";
import { posterOf } from "@/lib/jikan";
import { WatchlistButton } from "@/components/WatchlistButton";

export function AnimeCard({ anime, className = "" }: { anime: Anime; className?: string }) {
  const poster = posterOf(anime);
  const title = anime.title_english || anime.title;

  return (
    <div className={`group min-w-0 ${className}`}>
      <Link
        to="/anime/$animeId"
        params={{ animeId: String(anime.mal_id) }}
        className="block"
        aria-label={title}
      >
        <div className="ink-panel-sm ink-press halftone relative overflow-hidden">
          {poster ? (
            <img
              src={poster}
              alt={`${title} poster art`}
              loading="lazy"
              className="aspect-2/3 w-full object-cover grayscale-[35%] transition-all duration-200 group-hover:grayscale-0"
            />
          ) : (
            <div className="grid aspect-2/3 w-full place-items-center bg-muted">
              <span className="font-mono text-[10px] tracking-widest uppercase">No art</span>
            </div>
          )}
          {typeof anime.score === "number" && (
            <span className="absolute top-2 left-2 border-2 border-border bg-accent px-1.5 py-0.5 font-mono text-[10px] font-bold text-accent-foreground">
              <Star className="mr-0.5 inline size-3 -translate-y-px" strokeWidth={3} />
              {anime.score.toFixed(1)}
            </span>
          )}
        </div>
      </Link>
      <div className="mt-2.5 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link to="/anime/$animeId" params={{ animeId: String(anime.mal_id) }}>
            <p className="line-clamp-2 break-words font-display text-[13px] leading-tight">{title}</p>
          </Link>
          <p className="mt-1 break-words font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
            {[anime.type, anime.year, anime.genres?.[0]?.name].filter(Boolean).join(" · ")}
          </p>
        </div>
        <WatchlistButton anime={anime} compact />
      </div>
    </div>
  );
}
