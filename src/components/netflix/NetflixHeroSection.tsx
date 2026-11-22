import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Info, ChevronRight, Star } from "lucide-react";
import type { Anime } from "@/lib/jikan";
import { posterOf } from "@/lib/jikan";
import type { HistoryRow } from "@/lib/library";

export function NetflixHeroSection({
  featuredList,
  historyList = [],
}: {
  featuredList: Anime[];
  historyList?: HistoryRow[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-rotate featured item every 8 seconds
  useEffect(() => {
    if (featuredList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featuredList.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [featuredList.length]);

  if (!featuredList.length) return null;

  const current = featuredList[currentIndex % featuredList.length];
  if (!current) return null;

  const poster = posterOf(current, true);
  const title = current.title_english || current.title;
  const genres = (current.genres || []).map((g) => g.name).slice(0, 3).join(" • ");
  const year = current.year || (current.aired?.from ? new Date(current.aired.from).getFullYear() : 2024);
  const epCount = current.episodes ? `${current.episodes} Episodes` : "1 Season";

  // Match score calculation
  const matchPct = current.score ? Math.min(99, Math.round(current.score * 10) + 2) : 96;

  // Next two cards for Continue Watching column:
  // Prefer real user watch history; if not enough, use subsequent items from featured/trending
  const nextCards = (() => {
    const list: Array<{
      id: number;
      title: string;
      image: string;
      match: number;
      genres: string;
      episode?: number;
      type: string;
    }> = [];

    // Add up to 2 items from real history
    for (const h of historyList.slice(0, 2)) {
      list.push({
        id: h.mal_id,
        title: h.title,
        image: h.image_url || "",
        match: 95,
        genres: "Action • Drama",
        episode: h.episode_number || h.episodes_watched || 1,
        type: "SERIES",
      });
    }

    // Fill remaining slots with anime from featuredList
    let offset = 1;
    while (list.length < 2 && offset < featuredList.length) {
      const candidate = featuredList[(currentIndex + offset) % featuredList.length];
      if (candidate && !list.some((item) => item.id === candidate.mal_id) && candidate.mal_id !== current.mal_id) {
        list.push({
          id: candidate.mal_id,
          title: candidate.title_english || candidate.title,
          image: posterOf(candidate) || "",
          match: candidate.score ? Math.min(99, Math.round(candidate.score * 10)) : 94,
          genres: (candidate.genres || []).map((g) => g.name).slice(0, 2).join(" • ") || "Anime",
          episode: 1,
          type: candidate.type === "Movie" ? "FILM" : "SERIES",
        });
      }
      offset++;
    }

    return list;
  })();

  return (
    <section className="mb-8">
      {/* Section Header */}
      <div className="mb-3.5 flex items-center justify-between">
        <Link
          to="/watchlist"
          className="group flex items-center gap-1.5 text-base sm:text-lg font-bold text-white transition-colors hover:text-white/80"
        >
          <span>Continue Watching</span>
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 text-white/60" />
        </Link>
      </div>

      {/* Grid: Featured Hero Spotlight + 2 Continue Watching Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Main Featured Hero Card */}
        <div className="relative min-h-[380px] sm:min-h-[420px] rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden lg:col-span-8 flex flex-col justify-end p-5 sm:p-7 shadow-2xl transition-all">
          {/* Background Image / Key Visual */}
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-[1.02]"
            style={{
              backgroundImage: `url(${poster})`,
            }}
          />
          {/* Moody Netflix Vignette Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d12] via-[#0c0d12]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d12]/80 via-transparent to-transparent" />

          {/* Content Overlay */}
          <div className="relative z-10 space-y-2.5 max-w-xl">
            {/* Red Z Series Badge */}
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-[#E50914] tracking-tighter">Z</span>
              <span className="text-[10px] font-bold tracking-[0.2em] text-white/90 uppercase">
                {current.type === "Movie" ? "FILM" : "SERIES"}
              </span>
            </div>

            {/* Title */}
            <h1 className="font-black text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight uppercase leading-none drop-shadow-md">
              {title}
            </h1>

            {/* Meta Row: Match %, Year, Episodes, 4K Badge */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-white/90">
              <span className="font-bold text-emerald-400">{matchPct}% Match</span>
              <span className="text-white/60">{year}</span>
              <span className="text-white/60">{epCount}</span>
              <span className="rounded border border-white/30 px-1 py-0.2 text-[9px] font-bold tracking-wider text-white/80">
                4K
              </span>
            </div>

            {/* Genres */}
            {genres && <p className="text-xs font-medium text-white/70">{genres}</p>}

            {/* Synopsis */}
            <p className="line-clamp-2 text-xs sm:text-sm text-white/75 text-pretty max-w-lg leading-relaxed">
              {current.synopsis || "No synopsis available for this title yet."}
            </p>

            {/* Actions: Play and More Info */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                to="/watch/$animeId/$episodeNumber"
                params={{ animeId: String(current.mal_id), episodeNumber: "1" }}
                className="flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-black shadow-lg transition-transform hover:scale-105 hover:bg-neutral-200"
              >
                <Play className="size-4 fill-black" />
                <span>Play</span>
              </Link>

              <Link
                to="/anime/$animeId"
                params={{ animeId: String(current.mal_id) }}
                className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/20 px-4 py-2.5 text-xs sm:text-sm font-medium text-white backdrop-blur-md transition-all hover:bg-white/30 hover:border-white/30"
              >
                <Info className="size-4" />
                <span>More Info</span>
              </Link>
            </div>
          </div>

          {/* Carousel Pagination Dots in Bottom Right */}
          {featuredList.length > 1 && (
            <div className="absolute bottom-5 right-6 z-20 flex items-center gap-1.5">
              {featuredList.slice(0, 5).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-1.5 transition-all rounded-full ${
                    idx === currentIndex % 5
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/40 hover:bg-white/70"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: 2 Vertical Continue Watching Cards */}
        <div className="grid grid-cols-2 gap-3.5 lg:col-span-4">
          {nextCards.map((item) => (
            <Link
              key={item.id}
              to="/watch/$animeId/$episodeNumber"
              params={{ animeId: String(item.id), episodeNumber: String(item.episode || 1) }}
              className="group relative flex flex-col justify-end overflow-hidden rounded-2xl sm:rounded-3xl border border-white/10 bg-[#12141a] p-3.5 shadow-lg transition-all duration-300 hover:border-white/30 hover:scale-[1.02] aspect-[3/4.2]"
            >
              {/* Card Poster Image */}
              <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              {/* Dark Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent" />

              {/* Card Content */}
              <div className="relative z-10 space-y-1">
                <div className="flex items-center gap-1">
                  <span className="font-black text-xs text-[#E50914] tracking-tighter">Z</span>
                  <span className="text-[9px] font-bold tracking-widest text-white/80 uppercase">
                    {item.type}
                  </span>
                </div>
                <p className="line-clamp-1 font-bold text-sm text-white uppercase tracking-tight group-hover:text-white">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="font-semibold text-emerald-400">{item.match}% Match</span>
                </div>
                <p className="line-clamp-1 text-[10px] text-white/60">{item.genres}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
