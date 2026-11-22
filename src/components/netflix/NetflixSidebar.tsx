import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Flame,
  Tv,
  Film,
  Plus,
  Globe,
  Clock,
  Bookmark,
  Download,
  User as UserIcon,
  Search,
  Layers,
} from "lucide-react";
import { usePreferences, type ThemePref } from "@/lib/preferences";
import { useAuth } from "@/hooks/useAuth";
import { DownloadsModal } from "./DownloadsModal";

export function NetflixSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const { theme, setTheme, language, setLanguage } = usePreferences();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [downloadsOpen, setDownloadsOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchTerm.trim();
    if (!q) return;
    navigate({ to: "/search", search: { q, page: 1 } });
  };

  const isHomeActive = pathname === "/";
  const isNewAndPopular = pathname === "/browse" && searchStr.includes("popularity");
  const isTvShows = pathname === "/browse" && searchStr.includes("type=tv");
  const isMovies = pathname === "/browse" && searchStr.includes("type=movie");
  const isWatchlist = pathname === "/watchlist";
  const isRecentlyAdded = pathname === "/browse" && searchStr.includes("order=latest");
  const isProfile = pathname === "/profile" || pathname.startsWith("/profile/");

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "jp" : "en");
  };

  return (
    <>
      <aside className="w-full shrink-0 border-r border-white/10 bg-[#0a0a0e]/60 p-5 backdrop-blur-xl lg:w-60 lg:min-h-full flex flex-col justify-between">
        <div className="space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <Link to="/" className="inline-block transition-transform hover:scale-105">
              <span className="font-black text-2xl tracking-tighter text-[#E50914] select-none">
                ZENKAI
              </span>
            </Link>
          </div>

          {/* Search Pill Input */}
          <form onSubmit={handleSearch} className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full rounded-full border border-white/10 bg-white/10 py-1.5 pr-3 pl-9 text-xs text-white placeholder-white/40 outline-none transition-all duration-200 hover:bg-white/15 focus:border-white/30 focus:bg-white/20"
            />
          </form>

          {/* Home Section */}
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
              Home
            </p>
            <nav className="space-y-1">
              <Link
                to="/"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isHomeActive
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Home className="size-4 shrink-0" />
                <span>Home</span>
              </Link>

              <Link
                to="/browse"
                search={{ genre: "", type: "", order: "popularity", page: 1 }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isNewAndPopular
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Flame className="size-4 shrink-0" />
                <span>New & Popular</span>
              </Link>

              <Link
                to="/browse"
                search={{ genre: "", type: "tv", order: "popularity", page: 1 }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isTvShows
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Tv className="size-4 shrink-0" />
                <span>TV Shows</span>
              </Link>

              <Link
                to="/browse"
                search={{ genre: "", type: "movie", order: "popularity", page: 1 }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isMovies
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Film className="size-4 shrink-0" />
                <span>Movies</span>
              </Link>

              <Link
                to="/watchlist"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isWatchlist
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Plus className="size-4 shrink-0" />
                <span>My List</span>
              </Link>

              <button
                type="button"
                onClick={toggleLanguage}
                title="Toggle preferred audio language (EN dub or JP sub)"
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2 text-left text-xs font-medium text-white/65 transition-all hover:bg-white/5 hover:text-white"
              >
                <div className="flex items-center gap-3">
                  <Globe className="size-4 shrink-0" />
                  <span>Browse by Languages</span>
                </div>
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
                  {language}
                </span>
              </button>
            </nav>
          </div>

          {/* Library Section */}
          <div>
            <p className="mb-2 px-2 text-[11px] font-semibold tracking-wider text-white/40 uppercase">
              Library
            </p>
            <nav className="space-y-1">
              <Link
                to="/browse"
                search={{ genre: "", type: "", order: "latest", page: 1 }}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isRecentlyAdded
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Clock className="size-4 shrink-0" />
                <span>Recently Added</span>
              </Link>

              <Link
                to="/watchlist"
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isWatchlist
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Bookmark className="size-4 shrink-0" />
                <span>Watch Later</span>
              </Link>

              <button
                type="button"
                onClick={() => setDownloadsOpen(true)}
                className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-left text-xs font-medium text-white/65 transition-all hover:bg-white/5 hover:text-white"
              >
                <Download className="size-4 shrink-0" />
                <span>Downloads</span>
              </button>

              <Link
                to={user ? "/profile" : "/auth"}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-medium transition-all ${
                  isProfile
                    ? "bg-white/15 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                <UserIcon className="size-4 shrink-0" />
                <span>My Account</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom Theme & Language Switcher */}
        <div className="mt-8 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between text-xs text-white/50">
            <div className="flex items-center gap-1.5">
              <Layers className="size-3.5" />
              <span>Theme</span>
            </div>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemePref)}
              className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] font-semibold text-white outline-none focus:border-white/30"
            >
              <option value="netflix" className="bg-[#12141a] text-white">
                Netflix
              </option>
              <option value="glass" className="bg-[#12141a] text-white">
                Liquid Glass
              </option>
              <option value="manga" className="bg-[#12141a] text-white">
                Manga
              </option>
            </select>
          </div>
        </div>
      </aside>

      <DownloadsModal open={downloadsOpen} onOpenChange={setDownloadsOpen} />
    </>
  );
}
