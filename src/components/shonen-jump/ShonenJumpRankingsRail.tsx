import { Link } from "@tanstack/react-router";
import { ChevronRight, Star, Trophy } from "lucide-react";
import { type Anime, posterOf } from "@/lib/jikan";

interface ShonenJumpRankingsRailProps {
  title: string;
  items: Anime[];
  to?: string;
  search?: Record<string, unknown>;
}

export function ShonenJumpRankingsRail({
  title,
  items,
  to = "/browse",
  search = { order: "score", page: 1 },
}: ShonenJumpRankingsRailProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#FFCC00] text-black">
            <Trophy className="size-4" />
          </div>
          <h2 className="font-display text-lg sm:text-2xl font-black italic tracking-tight text-white uppercase">
            {title}
          </h2>
          <span className="hidden sm:inline-block rounded-md bg-[#E60012] px-2 py-0.5 text-[10px] font-black uppercase text-white">
            TOP 10
          </span>
        </div>

        <Link
          to={to}
          search={search}
          className="group flex items-center gap-1 text-xs font-bold text-[#FFCC00] hover:text-white transition-colors"
        >
          <span>VIEW FULL RANKINGS</span>
          <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* Rankings List / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {items.slice(0, 6).map((anime, index) => {
          const rank = index + 1;
          const coverUrl = posterOf(anime);

          // Rank badge styling
          let rankBadgeClass = "bg-[#E60012] text-white";
          if (rank === 1) {
            rankBadgeClass =
              "bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/30 ring-2 ring-yellow-200";
          } else if (rank === 2) {
            rankBadgeClass =
              "bg-gradient-to-br from-slate-100 via-slate-300 to-zinc-400 text-black shadow-md ring-2 ring-white/60";
          } else if (rank === 3) {
            rankBadgeClass =
              "bg-gradient-to-br from-amber-600 via-amber-700 to-yellow-800 text-white shadow-md ring-2 ring-amber-400/50";
          }

          return (
            <Link
              key={anime.mal_id}
              to="/anime/$animeId"
              params={{ animeId: String(anime.mal_id) }}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12131a] p-2 transition-all hover:-translate-y-1 hover:border-[#E60012] hover:shadow-[0_8px_25px_rgba(230,0,18,0.25)]"
            >
              {/* Cover Art Container */}
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-black/40">
                <img
                  src={coverUrl || ""}
                  alt={anime.title}
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Shonen Jump Rank Badge */}
                <div
                  className={`absolute top-2 left-2 flex items-center justify-center rounded-lg px-2 py-0.5 font-display text-xs sm:text-sm font-black italic tracking-wider shadow-xl ${rankBadgeClass}`}
                >
                  #{rank}
                </div>

                {/* Score Pill */}
                {anime.score && (
                  <div className="absolute top-2 right-2 flex items-center gap-0.5 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                    <Star className="size-2.5 fill-[#FFCC00] text-[#FFCC00]" />
                    <span>{anime.score.toFixed(1)}</span>
                  </div>
                )}

                {/* Bottom Volume Label */}
                <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                  <span className="rounded bg-black/80 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[#FFCC00]">
                    JUMP COMICS
                  </span>
                </div>
              </div>

              {/* Title & Info */}
              <div className="mt-2.5 flex-1 px-1">
                <h3 className="line-clamp-1 text-xs sm:text-sm font-bold text-white group-hover:text-[#FFCC00] transition-colors leading-snug">
                  {anime.title_english || anime.title}
                </h3>
                <div className="mt-1 flex items-center justify-between text-[10px] text-white/50">
                  <span>{anime.type ?? "TV"}</span>
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
