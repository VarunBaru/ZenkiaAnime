import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { historyQuery, formatClock } from "@/lib/library";
import { trendingQuery, posterOf } from "@/lib/jikan";
import { usePreferences } from "@/lib/preferences";

export function NetflixMiniPlayer() {
  const { user } = useAuth();
  const { theme } = usePreferences();
  const navigate = useNavigate();
  const isGlass = theme === "glass";
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const history = useQuery(historyQuery(user?.id));
  const trending = useQuery(trendingQuery());

  if (isDismissed) return null;

  // Most recent history entry or top trending fallback
  const latestHistory = history.data?.[0];
  const fallbackAnime = trending.data?.[0];

  if (!latestHistory && !fallbackAnime) return null;

  const animeId = latestHistory ? latestHistory.mal_id : fallbackAnime?.mal_id;
  const episodeNumber = latestHistory ? (latestHistory.episode_number || latestHistory.episodes_watched || 1) : 1;
  const title = latestHistory ? latestHistory.title : (fallbackAnime?.title_english || fallbackAnime?.title || "Anime");
  const image = latestHistory?.image_url || (fallbackAnime ? posterOf(fallbackAnime) : "");
  
  const posSeconds = latestHistory?.progress_seconds ?? 1145; // default ~19:05
  const durSeconds = latestHistory?.duration_seconds ?? 1440; // default 24:00
  const timeString = `${formatClock(posSeconds)} / ${formatClock(durSeconds)}`;

  const subtitle = latestHistory
    ? `Ep ${episodeNumber} • ${latestHistory.completed ? "Completed" : "In Progress"}`
    : `Ep 1 • Featured Preview`;

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlaying(!isPlaying);
  };

  const handleOpenWatch = () => {
    if (animeId) {
      navigate({
        to: "/watch/$animeId/$episodeNumber",
        params: { animeId: String(animeId), episodeNumber: String(episodeNumber) },
      });
    }
  };

  return (
    <div className="fixed bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-[640px] pointer-events-auto animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div
        className={`flex items-center justify-between gap-3 sm:gap-4 rounded-full px-4 py-2.5 sm:px-5 sm:py-3 transition-all duration-300 ${
          isGlass
            ? "border border-white/90 bg-white/80 text-slate-900 shadow-[0_20px_50px_-10px_rgba(100,116,139,0.2),inset_0_1.5px_2px_#ffffff] backdrop-blur-3xl"
            : "border border-white/20 bg-[#12141a]/95 text-white shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
        }`}
      >
        {/* Left: Thumbnail & Title Info */}
        <div
          onClick={handleOpenWatch}
          className="flex min-w-0 flex-1 items-center gap-3 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleOpenWatch()}
          aria-label={`Open ${title}`}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              className={`size-9 sm:size-11 shrink-0 rounded-xl object-cover ring-1 transition-all ${
                isGlass
                  ? "ring-black/10 group-hover:ring-black/25 shadow-sm"
                  : "ring-white/15 group-hover:ring-white/40"
              }`}
            />
          ) : (
            <div
              className={`size-9 sm:size-11 shrink-0 rounded-xl ${
                isGlass ? "bg-slate-200" : "bg-white/10 ring-1 ring-white/15"
              }`}
            />
          )}

          <div className="min-w-0">
            <p
              className={`truncate text-xs sm:text-sm font-bold transition-colors ${
                isGlass
                  ? "text-slate-900 group-hover:text-slate-950"
                  : "text-white group-hover:text-emerald-400"
              }`}
            >
              {title}
            </p>
            <p
              className={`truncate text-[10px] sm:text-[11px] ${
                isGlass ? "text-slate-500 font-medium" : "text-white/50"
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
            }}
            className={`transition-colors p-1 ${
              isGlass ? "text-slate-400 hover:text-slate-800" : "text-white/40 hover:text-white"
            }`}
            title="Dismiss mini player"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (episodeNumber > 1 && animeId) {
                navigate({
                  to: "/watch/$animeId/$episodeNumber",
                  params: { animeId: String(animeId), episodeNumber: String(episodeNumber - 1) },
                });
              }
            }}
            className={`transition-colors p-1 ${
              isGlass ? "text-slate-600 hover:text-slate-950" : "text-white/70 hover:text-white"
            }`}
            title="Previous episode"
            aria-label="Previous episode"
          >
            <SkipBack className="size-4" />
          </button>

          {/* Circular Play / Pause Button */}
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`grid size-8 sm:size-9 place-items-center rounded-full shadow-md transition-transform hover:scale-110 active:scale-95 ${
              isGlass
                ? "bg-slate-950 text-white shadow-slate-900/20"
                : "bg-white text-black"
            }`}
            title={isPlaying ? "Pause" : "Play"}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className={`size-4 ${isGlass ? "fill-white" : "fill-black"}`} />
            ) : (
              <Play className={`size-4 translate-x-0.5 ${isGlass ? "fill-white" : "fill-black"}`} />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (animeId) {
                navigate({
                  to: "/watch/$animeId/$episodeNumber",
                  params: { animeId: String(animeId), episodeNumber: String(episodeNumber + 1) },
                });
              }
            }}
            className={`transition-colors p-1 ${
              isGlass ? "text-slate-600 hover:text-slate-950" : "text-white/70 hover:text-white"
            }`}
            title="Next episode"
            aria-label="Next episode"
          >
            <SkipForward className="size-4" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className={`transition-colors p-1 hidden sm:block ${
              isGlass ? "text-slate-400 hover:text-slate-800" : "text-white/50 hover:text-white"
            }`}
            title="Repeat"
            aria-label="Repeat"
          >
            <Repeat className="size-3.5" />
          </button>
        </div>

        {/* Right: Time & Volume */}
        <div
          className={`hidden sm:flex items-center gap-3 shrink-0 ${
            isGlass ? "text-slate-500" : "text-white/60"
          }`}
        >
          <span className="text-[11px] font-mono tabular-nums">{timeString}</span>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted(!isMuted);
            }}
            className={`transition-colors p-1 ${
              isGlass ? "hover:text-slate-900" : "hover:text-white"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <VolumeX className="size-4 text-red-500" />
            ) : (
              <Volume2 className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
