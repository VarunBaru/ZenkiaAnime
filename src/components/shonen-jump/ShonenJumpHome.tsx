import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Compass, Flame, Sparkles, Trophy } from "lucide-react";
import type { Anime, Genre } from "@/lib/jikan";
import { ShonenJumpHero } from "./ShonenJumpHero";
import { ShonenJumpRankingsRail } from "./ShonenJumpRankingsRail";
import { ShonenJumpRail } from "./ShonenJumpRail";

interface ShonenJumpHomeProps {
  featuredList: Anime[];
  popular: { data?: Anime[] | undefined };
  trending: { data?: Anime[] | undefined };
  season: { data?: Anime[] | undefined };
  genres: { data?: Genre[] | undefined };
}

const JUMP_POPULAR_GENRES = [
  { name: "Action", mal_id: 1, desc: "High octane battles & martial arts", color: "from-red-600 to-rose-700" },
  { name: "Adventure", mal_id: 2, desc: "Epic quests & boundless worlds", color: "from-amber-500 to-yellow-600" },
  { name: "Supernatural", mal_id: 37, desc: "Curses, devils & arcane powers", color: "from-purple-600 to-indigo-700" },
  { name: "Fantasy", mal_id: 10, desc: "Magic guilds & mythical realms", color: "from-blue-600 to-cyan-700" },
  { name: "Comedy", mal_id: 4, desc: "Hilarious gags & daily chaos", color: "from-emerald-500 to-teal-700" },
  { name: "Sports", mal_id: 30, desc: "Sweat, teamwork & tournaments", color: "from-orange-500 to-red-600" },
];

export function ShonenJumpHome({
  featuredList,
  popular,
  trending,
  season,
  genres,
}: ShonenJumpHomeProps) {
  return (
    <div className="space-y-10">
      {/* 1. Hero Magazine Cover Feature */}
      <ShonenJumpHero featuredList={featuredList} />

      {/* 2. Top Weekly Rankings with #1, #2, #3 Badges */}
      <ShonenJumpRankingsRail
        title="Weekly Jump Rankings"
        items={trending.data ?? popular.data ?? []}
        to="/browse"
        search={{ order: "score", page: 1 }}
      />

      {/* 3. Flagship Weekly Lineup Hits */}
      <ShonenJumpRail
        title="Weekly Shonen Jump Lineup"
        items={popular.data ?? []}
        tag="FLAGSHIP"
        to="/browse"
        search={{ order: "popularity", page: 1 }}
      />

      {/* 4. New Season Simulcasts */}
      <ShonenJumpRail
        title="New & Trending Simulcasts"
        items={season.data ?? []}
        tag="NEW"
        to="/browse"
        search={{ order: "airing", page: 1 }}
      />

      {/* 5. Jump Magazine Genre Explorer */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded bg-[#FFCC00] text-black">
            <Compass className="size-3.5" />
          </div>
          <h2 className="font-display text-base sm:text-xl font-black italic tracking-tight text-white uppercase">
            Browse by Jump Genre
          </h2>
          <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-white/70">
            CATEGORIES
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {JUMP_POPULAR_GENRES.map((g) => (
            <Link
              key={g.name}
              to="/browse"
              search={{ genre: String(g.mal_id), page: 1, type: "", order: "popularity" }}
              className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${g.color} p-4 transition-all hover:scale-105 hover:shadow-lg`}
            >
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
              <div className="relative z-10 flex flex-col justify-between h-full space-y-2">
                <span className="font-display text-sm sm:text-base font-black italic tracking-wider text-white uppercase drop-shadow-sm">
                  {g.name}
                </span>
                <p className="text-[10px] text-white/80 line-clamp-1 leading-snug">
                  {g.desc}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-mono text-[9px] font-bold text-[#FFCC00] uppercase">
                    EXPLORE →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
