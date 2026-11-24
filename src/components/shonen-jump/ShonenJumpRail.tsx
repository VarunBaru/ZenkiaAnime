import { Link } from "@tanstack/react-router";
import { ChevronRight, Flame } from "lucide-react";
import { type Anime, posterOf } from "@/lib/jikan";

interface ShonenJumpRailProps {
  title: string;
  items: Anime[];
  tag?: string;
  to?: string;
  search?: Record<string, unknown>;
}

export function ShonenJumpRail({
  title,
  items,
  tag = "HOT",
  to = "/browse",
  search = { order: "popularity", page: 1 },
}: ShonenJumpRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-3.5">
      {/* Rail Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-[#E60012] text-white">
            <Flame className="size-3.5" />
          </div>
          <h2 className="font-display text-base sm:text-xl font-black italic tracking-tight text-white uppercase">
            {title}
          </h2>
          {tag && (
            <span className="rounded bg-[#FFCC00] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-black">
              {tag}
            </span>
          )}
        </div>

        <Link
          to={to}
          search={search}
          className="group flex items-center gap-1 text-xs font-bold text-white/60 hover:text-[#FFCC00] transition-colors"
        >
          <span>EXPLORE ALL</span>
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Grid of Jump Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {items.slice(0, 6).map((anime) => {
          const coverUrl = posterOf(anime);

          return (
            <Link
              key={anime.mal_id}
              to="/anime/$animeId"
              params={{ animeId: String(anime.mal_id) }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12131a] p-2 transition-all hover:-translate-y-1 hover:border-[#E60012] hover:shadow-[0_8px_25px_rgba(230,0,18,0.25)]"
            >
              {/* Cover Art */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black/40">
                <img
                  src={coverUrl || ""}
                  alt={anime.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Shonen Jump Badge */}
                <div className="absolute top-2 left-2 rounded bg-[#E60012] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider text-white shadow-md">
                  JUMP
                </div>

                {/* Year or Score */}
                {anime.year && (
                  <div className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold text-white/80">
                    {anime.year}
                  </div>
                )}
              </div>

              {/* Title & Info */}
              <div className="mt-2.5 flex-1 px-1">
                <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-white group-hover:text-[#FFCC00] transition-colors leading-snug">
                  {anime.title_english || anime.title}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
                  <span className="truncate max-w-[80px]">
                    {anime.genres?.[0]?.name ?? "Shonen"}
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
