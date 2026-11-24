import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Flame, Info, Play, Star, Sparkles } from "lucide-react";
import type { Anime } from "@/lib/jikan";
import { posterOf } from "@/lib/jikan";
import { ShonenJumpPirateEmblem } from "./ShonenJumpLogo";

interface ShonenJumpHeroProps {
  featuredList: Anime[];
}

export function ShonenJumpHero({ featuredList }: ShonenJumpHeroProps) {
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

  const prevIssue = () => {
    setIndex((prev) => (prev - 1 + featuredList.length) % featuredList.length);
  };

  const nextIssue = () => {
    setIndex((prev) => (prev + 1) % featuredList.length);
  };

  const backgroundUrl = posterOf(current, true);

  const title = current.title_english || current.title;
  const japaneseTitle = current.title_japanese || "週刊少年ジャンプ";
  const genres = current.genres?.map((g: { name: string }) => g.name).slice(0, 3) || ["Action", "Shonen"];
  const score = current.score ? current.score.toFixed(1) : "9.8";

  // Pick next 2 anime for the side magazine teaser preview
  const previewItems = featuredList
    .filter((_, i) => i !== index)
    .slice(0, 2);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0f1016] shadow-2xl">
      {/* Background Poster Artwork with Gradient & Speedlines Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={backgroundUrl || ""}
          alt={title}
          className="size-full object-cover object-top opacity-35 filter brightness-75 scale-105 transition-all duration-1000 ease-out"
        />
        {/* Shonen Jump Dark Crimson Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d12] via-[#0c0d12]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d12] via-[#0c0d12]/70 to-transparent" />
        {/* Subtle Diagonal Action Lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-15"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(230,0,18,0.2) 0, rgba(230,0,18,0.2) 1px, transparent 0, transparent 40px)",
          }}
        />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 sm:p-8 lg:p-10 items-center">
        {/* Left Column: Headline, Magazine Issue Meta & Actions (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-center space-y-4 max-w-2xl">
          {/* Top Magazine Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-[#E60012] px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-lg">
              <ShonenJumpPirateEmblem className="size-4" />
              <span>WEEKLY SHONEN JUMP</span>
            </div>
            <span className="rounded-full border border-[#FFCC00]/40 bg-[#FFCC00]/10 px-2.5 py-0.5 text-[11px] font-black uppercase text-[#FFCC00]">
              ISSUE #{index + 1} LEAD COLOR
            </span>
            <div className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white">
              <Star className="size-3 fill-[#FFCC00] text-[#FFCC00]" />
              <span>{score} JUMP SCORE</span>
            </div>
          </div>

          {/* Japanese Subtitle */}
          <p className="font-mono text-xs sm:text-sm font-bold tracking-widest text-[#FFCC00]/90 uppercase">
            {japaneseTitle}
          </p>

          {/* Main Title */}
          <h1 className="font-display text-3xl sm:text-5xl lg:text-6xl font-black italic tracking-tight text-white uppercase drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)] leading-[0.95]">
            {title}
          </h1>

          {/* Genre & Meta Tags */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/70">
            {genres.map((g: string) => (
              <span
                key={g}
                className="rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-white/80"
              >
                {g}
              </span>
            ))}
            {current.episodes && (
              <span className="text-white/50">• {current.episodes} Episodes</span>
            )}
            {current.year && <span className="text-white/50">• {current.year}</span>}
          </div>

          {/* Synopsis */}
          <p className="line-clamp-3 text-xs sm:text-sm leading-relaxed text-white/80 text-pretty">
            {current.synopsis ??
              "Follow the high-stakes journey of courage, friendship, and relentless training in this Weekly Shonen Jump masterpiece."}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to="/watch/$animeId/$episodeNumber"
              params={{ animeId: String(current.mal_id), episodeNumber: "1" }}
              className="flex items-center gap-2 rounded-xl bg-[#E60012] px-6 py-3 font-display text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_20px_rgba(230,0,18,0.5)] transition-all hover:bg-red-600 hover:scale-105 active:scale-95"
            >
              <Play className="size-4 fill-white" />
              <span>START WATCHING</span>
            </Link>

            <Link
              to="/anime/$animeId"
              params={{ animeId: String(current.mal_id) }}
              className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-xs sm:text-sm font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:border-white/40"
            >
              <Info className="size-4 text-[#FFCC00]" />
              <span>MANGA & DETAILS</span>
            </Link>

            {/* Slide Navigation Controls */}
            <div className="ml-auto hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={prevIssue}
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/70 transition-colors hover:border-[#FFCC00] hover:text-white"
                aria-label="Previous Issue"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="font-mono text-xs font-bold text-white/60 px-1">
                {index + 1} / {featuredList.length}
              </span>
              <button
                type="button"
                onClick={nextIssue}
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-black/50 text-white/70 transition-colors hover:border-[#FFCC00] hover:text-white"
                aria-label="Next Issue"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Magazine Cover Spotlight Card & Up Next (4 cols) */}
        <div className="lg:col-span-4 hidden lg:flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#FFCC00] flex items-center gap-1">
              <Sparkles className="size-3" />
              NEXT IN LINEUP
            </span>
            <span className="text-[10px] text-white/40">ISSUE PREVIEWS</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {previewItems.map((item) => {
              const cover = posterOf(item, true);
              return (
                <Link
                  key={item.mal_id}
                  to="/anime/$animeId"
                  params={{ animeId: String(item.mal_id) }}
                  className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-all hover:scale-105 hover:border-[#E60012] hover:shadow-[0_0_20px_rgba(230,0,18,0.3)] aspect-[3/4]"
                >
                  <img
                    src={cover || ""}
                    alt={item.title}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute top-2 left-2 rounded bg-[#E60012] px-1.5 py-0.5 font-mono text-[9px] font-black uppercase text-white shadow-sm">
                    JUMP
                  </div>
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="line-clamp-2 text-xs font-bold text-white group-hover:text-[#FFCC00] transition-colors leading-tight">
                      {item.title}
                    </p>
                    <p className="text-[10px] font-semibold text-white/60 mt-0.5">
                      ★ {item.score ?? "8.9"}
                    </p>
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
