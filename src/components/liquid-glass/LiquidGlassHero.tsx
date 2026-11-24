import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Info, Play, Sparkles, Star } from "lucide-react";
import { type Anime, posterOf } from "@/lib/jikan";

interface LiquidGlassHeroProps {
  featuredList: Anime[];
}

export function LiquidGlassHero({ featuredList }: LiquidGlassHeroProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (featuredList.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % featuredList.length);
    }, 7000);
    return () => clearInterval(timer);
  }, [featuredList.length]);

  if (!featuredList || featuredList.length === 0) return null;

  const current = featuredList[index] ?? featuredList[0];
  if (!current) return null;

  const prevSlide = () => {
    setIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
  };

  const nextSlide = () => {
    setIndex((prev) => (prev + 1) % featuredList.length);
  };

  const backgroundUrl = posterOf(current, true);
  const title = current.title_english || current.title;
  const genres = current.genres?.map((g: { name: string }) => g.name).slice(0, 3) || ["Action", "Adventure"];
  const score = current.score ? current.score.toFixed(1) : "9.2";

  const previewItems = featuredList
    .filter((_, i) => i !== index)
    .slice(0, 2);

  return (
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/[0.05] p-6 sm:p-10 shadow-[0_30px_70px_rgba(0,0,0,0.6),inset_0_1px_1.5px_rgba(255,255,255,0.25)] backdrop-blur-3xl">
      {/* Background artwork with soft frosted glass diffusion */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={backgroundUrl || ""}
          alt={title}
          className="size-full object-cover object-top opacity-30 filter blur-xl scale-110 transition-all duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#08090e]/95 via-[#08090e]/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#08090e] via-transparent to-transparent" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Metadata, Title, Synopsis & Rounded Buttons */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-5 max-w-2xl">
          {/* Glass Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md">
              <Sparkles className="size-3.5 text-cyan-400" />
              <span>SPOTLIGHT FEATURE</span>
            </span>

            <div className="flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-bold text-white shadow-sm backdrop-blur-md">
              <Star className="size-3.5 fill-amber-400 text-amber-500" />
              <span>{score} RATING</span>
            </div>

            {current.episodes && (
              <span className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/70 shadow-sm backdrop-blur-md">
                {current.episodes} EPISODES
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.02] drop-shadow-md">
            {title}
          </h1>

          {/* Genre Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {genres.map((g: string) => (
              <span
                key={g}
                className="rounded-full border border-white/15 bg-white/[0.08] px-3 py-0.5 text-xs font-semibold text-white/80 shadow-sm backdrop-blur-md"
              >
                {g}
              </span>
            ))}
            {current.year && (
              <span className="text-xs font-medium text-white/50">• {current.year}</span>
            )}
          </div>

          {/* Synopsis */}
          <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed text-white/70 font-normal">
            {current.synopsis ??
              "Immerse yourself in this visually stunning animated masterpiece with crisp high-definition streaming and liquid clarity."}
          </p>

          {/* Rounded Glass Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/watch/$animeId/$episodeNumber"
              params={{ animeId: String(current.mal_id), episodeNumber: "1" }}
              className="flex items-center gap-2 rounded-full bg-white px-7 py-3 font-display text-xs sm:text-sm font-bold tracking-wide text-slate-950 shadow-[0_0_25px_rgba(255,255,255,0.35),0_8px_20px_rgba(0,0,0,0.5)] transition-all hover:bg-white/90 hover:scale-105 active:scale-95"
            >
              <Play className="size-4 fill-slate-950" />
              <span>STREAM NOW</span>
            </Link>

            <Link
              to="/anime/$animeId"
              params={{ animeId: String(current.mal_id) }}
              className="flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-6 py-3 text-xs sm:text-sm font-semibold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-md transition-all hover:bg-white/[0.16] hover:border-white/35"
            >
              <Info className="size-4 text-white/70" />
              <span>DETAILS & EPISODES</span>
            </Link>

            {/* Slider Navigation */}
            <div className="ml-auto hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm transition-all hover:bg-white/20"
                aria-label="Previous Spotlight"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono text-xs font-bold text-white/60 px-1.5">
                {index + 1} / {featuredList.length}
              </span>
              <button
                type="button"
                onClick={nextSlide}
                className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm transition-all hover:bg-white/20"
                aria-label="Next Spotlight"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Fluid Glass Capsule Preview Cards */}
        <div className="lg:col-span-4 hidden lg:flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-1.5">
              <Sparkles className="size-3 text-cyan-400" />
              UP NEXT IN LIQUID GLASS
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            {previewItems.map((item) => {
              const cover = posterOf(item, true);
              return (
                <Link
                  key={item.mal_id}
                  to="/anime/$animeId"
                  params={{ animeId: String(item.mal_id) }}
                  className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/[0.06] p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.5),inset_0_1px_1.5px_rgba(255,255,255,0.2)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/[0.12] aspect-[3/4] flex flex-col"
                >
                  <div className="relative size-full overflow-hidden rounded-[1.25rem]">
                    <img
                      src={cover || ""}
                      alt={item.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#08090e]/90 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <p className="line-clamp-2 text-xs font-bold text-white group-hover:text-cyan-200 transition-colors leading-snug">
                        {item.title}
                      </p>
                      <p className="text-[10px] font-semibold text-white/80 mt-0.5">
                        ★ {item.score ?? "8.8"}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
