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
          <div className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
            <Compass className="size-3.5" />
          </div>
          <div>
            <h2 className="font-display text-lg sm:text-2xl font-bold tracking-tight text-slate-900">
              Browse by Atmosphere
            </h2>
            <p className="text-xs text-slate-500 font-medium">Explore curated genres in frosted glass</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {GLASS_GENRES.map((g) => (
            <Link
              key={g.name}
              to="/browse"
              search={{ genre: String(g.mal_id), page: 1, type: "", order: "popularity" }}
              className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/90 bg-white/70 p-4 shadow-[0_12px_30px_-8px_rgba(100,116,139,0.1),inset_0_1px_1.5px_#ffffff] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:bg-white/90 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-sm font-bold text-slate-900 group-hover:text-slate-950">
                  {g.name}
                </span>
                <Sparkles className="size-3.5 text-slate-400 group-hover:text-amber-500 transition-colors" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 line-clamp-1 leading-snug">
                {g.desc}
              </p>
              <span className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-slate-900 transition-colors">
                Explore →
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
