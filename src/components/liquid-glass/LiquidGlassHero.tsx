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
    <section className="relative overflow-hidden rounded-[2.5rem] border border-white/90 bg-white/70 p-6 sm:p-10 shadow-[0_24px_60px_-15px_rgba(100,116,139,0.14),inset_0_1.5px_2px_#ffffff] backdrop-blur-3xl">
      {/* Background artwork with soft frosted glass diffusion */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={backgroundUrl || ""}
          alt={title}
          className="size-full object-cover object-top opacity-20 filter blur-xl scale-110 transition-all duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-transparent to-white/40" />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Column: Metadata, Title, Synopsis & Rounded Buttons */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-5 max-w-2xl">
          {/* Glass Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-white/90 bg-white/90 px-3.5 py-1 text-xs font-bold text-slate-800 shadow-[0_4px_12px_-2px_rgba(100,116,139,0.1),inset_0_1px_1px_#ffffff]">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>SPOTLIGHT FEATURE</span>
            </span>

            <div className="flex items-center gap-1 rounded-full border border-white/80 bg-white/80 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm">
              <Star className="size-3.5 fill-amber-400 text-amber-500" />
              <span>{score} RATING</span>
            </div>

            {current.episodes && (
              <span className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                {current.episodes} EPISODES
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.02]">
            {title}
          </h1>

          {/* Genre Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {genres.map((g: string) => (
              <span
                key={g}
                className="rounded-full border border-slate-200/80 bg-white/70 px-3 py-0.5 text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-md"
              >
                {g}
              </span>
            ))}
            {current.year && (
              <span className="text-xs font-medium text-slate-500">• {current.year}</span>
            )}
          </div>

          {/* Synopsis */}
          <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed text-slate-600 font-normal">
            {current.synopsis ??
              "Immerse yourself in this visually stunning animated masterpiece with crisp high-definition streaming and liquid clarity."}
          </p>

          {/* Rounded Glass Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/watch/$animeId/$episodeNumber"
              params={{ animeId: String(current.mal_id), episodeNumber: "1" }}
              className="flex items-center gap-2 rounded-full bg-slate-950 px-7 py-3 font-display text-xs sm:text-sm font-bold tracking-wide text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)] transition-all hover:bg-slate-800 hover:scale-105 active:scale-95"
            >
              <Play className="size-4 fill-white" />
              <span>STREAM NOW</span>
            </Link>

            <Link
              to="/anime/$animeId"
              params={{ animeId: String(current.mal_id) }}
              className="flex items-center gap-2 rounded-full border border-white/95 bg-white/85 px-6 py-3 text-xs sm:text-sm font-semibold text-slate-800 shadow-[0_4px_16px_-2px_rgba(100,116,139,0.1),inset_0_1px_1.5px_#ffffff] backdrop-blur-md transition-all hover:bg-white hover:shadow-md"
            >
              <Info className="size-4 text-slate-500" />
              <span>DETAILS & EPISODES</span>
            </Link>

            {/* Slider Navigation */}
            <div className="ml-auto hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevSlide}
                className="flex size-9 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-white hover:text-slate-950 hover:shadow-md"
                aria-label="Previous Spotlight"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono text-xs font-bold text-slate-500 px-1.5">
                {index + 1} / {featuredList.length}
              </span>
              <button
                type="button"
                onClick={nextSlide}
                className="flex size-9 items-center justify-center rounded-full border border-white/90 bg-white/80 text-slate-600 shadow-sm transition-all hover:bg-white hover:text-slate-950 hover:shadow-md"
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
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="size-3 text-slate-400" />
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
                  className="group relative overflow-hidden rounded-3xl border border-white/90 bg-white/70 p-1.5 shadow-[0_12px_30px_-8px_rgba(100,116,139,0.12),inset_0_1px_1.5px_#ffffff] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl aspect-[3/4] flex flex-col"
                >
                  <div className="relative size-full overflow-hidden rounded-[1.25rem]">
                    <img
                      src={cover || ""}
                      alt={item.title}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5">
                      <p className="line-clamp-2 text-xs font-bold text-white group-hover:text-amber-200 transition-colors leading-snug">
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
