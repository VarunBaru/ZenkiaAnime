import { Link } from "@tanstack/react-router";
import { Compass, Sparkles } from "lucide-react";
import type { Anime, Genre } from "@/lib/jikan";
import { LiquidGlassHero } from "./LiquidGlassHero";
import { LiquidGlassRail } from "./LiquidGlassRail";

interface LiquidGlassHomeProps {
  featuredList: Anime[];
  popular: { data?: Anime[] | undefined };
  trending: { data?: Anime[] | undefined };
  season: { data?: Anime[] | undefined };
  genres: { data?: Genre[] | undefined };
}

const GLASS_GENRES = [
  { name: "Action", mal_id: 1, desc: "High dynamic movement" },
  { name: "Adventure", mal_id: 2, desc: "Expansive horizons" },
  { name: "Fantasy", mal_id: 10, desc: "Ethereal mystical realms" },
  { name: "Sci-Fi", mal_id: 24, desc: "Futuristic architecture" },
  { name: "Supernatural", mal_id: 37, desc: "Otherworldly mysteries" },
  { name: "Slice of Life", mal_id: 36, desc: "Calm daily serenity" },
];

export function LiquidGlassHome({
  featuredList,
  popular,
  trending,
  season,
}: LiquidGlassHomeProps) {
  return (
    <div className="space-y-12">
      {/* 1. Fluid Spotlight Glass Hero */}
      <LiquidGlassHero featuredList={featuredList} />

      {/* 2. Top Trending in Liquid Clarity */}
      <LiquidGlassRail
        title="Trending in Liquid Clarity"
        subtitle="The most streamed titles this week"
        items={trending.data ?? popular.data ?? []}
        to="/browse"
        search={{ order: "score", page: 1, type: "", genre: "" }}
      />

      {/* 3. Popular Series */}
      <LiquidGlassRail
        title="Popular Anime Hits"
        subtitle="Loved by audiences worldwide"
        items={popular.data ?? []}
        to="/browse"
        search={{ order: "popularity", page: 1, type: "", genre: "" }}
      />

      {/* 4. This Season's Airing Releases */}
      <LiquidGlassRail
        title="Airing This Season"
        subtitle="Fresh weekly episodes in high definition"
        items={season.data ?? []}
        to="/browse"
        search={{ order: "airing", page: 1, type: "", genre: "" }}
      />

      {/* 5. Minimalist Glass Genre Pills */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm">
            <Compass className="size-3.5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white">
              Browse by Atmosphere
            </h2>
            <p className="text-xs text-white/60 font-medium">Explore curated genres in frosted glass</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {GLASS_GENRES.map((g) => (
            <Link
              key={g.name}
              to="/browse"
              search={{ genre: String(g.mal_id), page: 1, type: "", order: "popularity" }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-white/[0.05] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.2)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.1] hover:shadow-xl"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-white group-hover:text-cyan-200">
                  {g.name}
                </span>
                <Sparkles className="size-3.5 text-white/40 group-hover:text-cyan-400 transition-colors" />
              </div>
              <p className="mt-2 text-[11px] text-white/50 line-clamp-1 leading-snug">
                {g.desc}
              </p>
              <span className="mt-3 text-[10px] font-bold text-white/40 uppercase tracking-wider group-hover:text-white transition-colors">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
