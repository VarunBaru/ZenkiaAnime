import { Link } from "@tanstack/react-router";
import { ChevronRight, Star } from "lucide-react";
import { type Anime, posterOf } from "@/lib/jikan";

interface LiquidGlassRailProps {
  title: string;
  items: Anime[];
  subtitle?: string;
  to?: string;
  search?: Record<string, unknown>;
}

export function LiquidGlassRail({
  title,
  items,
  subtitle,
  to = "/browse",
  search = { order: "popularity", page: 1 },
}: LiquidGlassRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Rail Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>

        <Link
          to={to}
          search={search}
          className="group flex items-center gap-1 rounded-full border border-white/90 bg-white/75 px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:text-slate-950 hover:shadow-md"
        >
          <span>See all</span>
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Grid of Fluid Glass Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {items.slice(0, 6).map((anime) => {
          const coverUrl = posterOf(anime);

          return (
            <Link
              key={anime.mal_id}
              to="/anime/$animeId"
              params={{ animeId: String(anime.mal_id) }}
              className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/85 bg-white/70 p-2 shadow-[0_12px_32px_-8px_rgba(100,116,139,0.1),inset_0_1px_1.5px_#ffffff] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:bg-white/85 hover:shadow-[0_20px_40px_-10px_rgba(100,116,139,0.18),0_0_20px_rgba(255,255,255,0.8)]"
            >
              {/* Cover Art */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.25rem] bg-slate-100">
                <img
                  src={coverUrl || ""}
                  alt={anime.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Score Pill */}
                {anime.score && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-white/80 bg-white/85 px-2 py-0.5 text-[10px] font-bold text-slate-800 shadow-sm backdrop-blur-md">
                    <Star className="size-2.5 fill-amber-400 text-amber-500" />
                    <span>{anime.score.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="mt-2.5 flex-1 px-1.5 pb-1">
                <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-slate-900 group-hover:text-slate-950 transition-colors leading-snug">
                  {anime.title_english || anime.title}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-slate-500">
                  <span className="truncate max-w-[85px]">
                    {anime.genres?.[0]?.name ?? "Anime"}
                  </span>
                  <span>{anime.episodes ? `${anime.episodes} eps` : "Ongoing"}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
