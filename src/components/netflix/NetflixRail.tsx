import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { Anime } from "@/lib/jikan";
import { posterOf } from "@/lib/jikan";

export function NetflixRail({
  title,
  to,
  items,
}: {
  title: string;
  to?: string;
  items: Anime[];
}) {
  if (!items.length) return null;

  return (
    <section className="mb-8">
      {/* Rail Header */}
      <div className="mb-3.5 flex items-center justify-between">
        {to ? (
          <Link
            to={to}
            className="group flex items-center gap-1.5 text-base sm:text-lg font-bold text-white transition-colors hover:text-white/80"
          >
            <span>{title}</span>
            <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 text-white/60" />
          </Link>
        ) : (
          <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
        )}
      </div>

      {/* Horizontal Cards Rail */}
      <div className="no-scrollbar flex gap-3.5 sm:gap-4 overflow-x-auto pb-2 scroll-smooth">
        {items.map((anime) => {
          const poster = posterOf(anime);
          const animeTitle = anime.title_english || anime.title;
          const genres = (anime.genres || []).map((g) => g.name).slice(0, 2).join(" • ");
          const isMovie = anime.type === "Movie";

          return (
            <Link
              key={anime.mal_id}
              to="/anime/$animeId"
              params={{ animeId: String(anime.mal_id) }}
              className="group relative w-36 sm:w-44 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-[#12141a] shadow-lg transition-all duration-300 hover:border-white/30 hover:scale-105 aspect-[2/3]"
            >
              {/* Poster Image */}
              {poster ? (
                <img
                  src={poster}
                  alt={animeTitle}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="grid h-full w-full place-items-center bg-white/5 text-xs text-white/40">
                  No art
                </div>
              )}

              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d12] via-[#0c0d12]/40 to-transparent" />

              {/* Card Footer Information */}
              <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5">
                <div className="flex items-center gap-1">
                  <span className="font-black text-xs text-[#E50914] tracking-tighter">N</span>
                  <span className="text-[8px] font-bold tracking-widest text-white/80 uppercase">
                    {isMovie ? "FILM" : "SERIES"}
                  </span>
                </div>
                <p className="line-clamp-1 font-bold text-xs sm:text-sm text-white uppercase tracking-tight">
                  {animeTitle}
                </p>
                <p className="line-clamp-1 text-[10px] text-white/60">
                  {genres || anime.type || "Anime"}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
