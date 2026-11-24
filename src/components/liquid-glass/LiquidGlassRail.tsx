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
          <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-white/60 font-medium mt-0.5">{subtitle}</p>
          )}
        </div>

        <Link
          to={to}
          search={search}
          className="group flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3.5 py-1 text-xs font-semibold text-white/80 shadow-sm backdrop-blur-md transition-all hover:bg-white/20 hover:text-white"
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
              className="group relative flex flex-col overflow-hidden rounded-[1.75rem] border border-white/12 bg-white/[0.05] p-2 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.2)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/30 hover:bg-white/[0.1] hover:shadow-[0_24px_50px_rgba(0,0,0,0.7),0_0_20px_rgba(255,255,255,0.12)]"
            >
              {/* Cover Art */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.25rem] bg-slate-900">
                <img
                  src={coverUrl || ""}
                  alt={anime.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Score Pill */}
                {anime.score && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 rounded-full border border-white/20 bg-[#08090e]/75 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-md">
                    <Star className="size-2.5 fill-amber-400 text-amber-500" />
                    <span>{anime.score.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="mt-2.5 flex-1 px-1.5 pb-1">
                <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-white group-hover:text-cyan-200 transition-colors leading-snug">
                  {anime.title_english || anime.title}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-white/50">
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
