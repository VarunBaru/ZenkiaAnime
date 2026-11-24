import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  ChevronDown,
  Compass,
  Droplets,
  Flame,
  Layers,
  LogOut,
  Menu,
  Search,
  Sparkles,
  User as UserIcon,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences, type ThemePref } from "@/lib/preferences";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const THEMES: { id: ThemePref; label: string; desc: string }[] = [
  { id: "glass", label: "Liquid Glass", desc: "Frosted glass & soft lighting" },
  { id: "netflix", label: "Zenkai", desc: "Dark streaming layout" },
  { id: "shonen-jump", label: "Shonen Jump", desc: "Weekly manga magazine style" },
  { id: "manga", label: "Manga", desc: "Ink black & screentones" },
];

export function LiquidGlassHeader() {
  const { user } = useAuth();
  const { theme, setTheme, language, setLanguage } = usePreferences();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(user?.id));

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    navigate({ to: "/search", search: { q: searchTerm.trim(), page: 1 } });
    setSearchTerm("");
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const displayName =
    profile.data?.username ??
    user?.user_metadata?.["display_name"] ??
    user?.email?.split("@")[0] ??
    "Anime Fan";

  const avatarUrl =
    profile.data?.avatar_url ??
    user?.user_metadata?.["avatar_url"] ??
    "https://api.dicebear.com/7.x/bottts/svg?seed=liquid";

  return (
    <header className="sticky top-3 z-50 px-3 sm:px-6">
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 rounded-full border border-white/15 bg-[#0e111a]/70 px-4 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25)] backdrop-blur-2xl transition-all duration-300">
        {/* Left: Brand Logo & Mobile Trigger */}
        <div className="flex items-center gap-2.5">
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-sm lg:hidden hover:bg-white/20 transition-colors"
                aria-label="Open Navigation"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-r border-white/15 bg-[#0e111a]/95 p-6 backdrop-blur-3xl text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-white">
                  <div className="flex size-7 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm">
                    <Droplets className="size-3.5" />
                  </div>
                  <span>ZENKAI</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {/* Audio Dub/Sub */}
                <div>
                  <p className="mb-2 text-[11px] font-bold tracking-wider uppercase text-white/50">
                    Audio Language
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/15 bg-white/[0.06] p-1">
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`rounded-full py-1.5 text-xs font-bold transition-all ${
                        language === "en"
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("jp")}
                      className={`rounded-full py-1.5 text-xs font-bold transition-all ${
                        language === "jp"
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-white/70 hover:text-white"
                      }`}
                    >
                      🇯🇵 Japanese
                    </button>
                  </div>
                </div>

                {/* Mobile Links */}
                <div className="space-y-1">
                  <p className="mb-2 text-[11px] font-bold tracking-wider uppercase text-white/50">
                    Navigation
                  </p>
                  <Link
                    to="/"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "popularity", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <span>Browse</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "airing", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <span>Trending</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "score", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <span>Top Rated</span>
                  </Link>
                  <Link
                    to="/watchlist"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <span>Watchlist</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="group flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-white text-slate-950 shadow-[0_0_15px_rgba(255,255,255,0.4)] transition-transform group-hover:scale-105">
              <Droplets className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base sm:text-lg font-black tracking-tight text-white leading-none">
                ZENKAI
              </span>
              <span className="text-[9px] font-semibold tracking-widest text-white/60 uppercase">
                LIQUID GLASS
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Fluid Glass Navigation Pills */}
        <nav className="hidden items-center gap-1 lg:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
            activeProps={{
              className:
                "bg-white/20 font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] border border-white/25 backdrop-blur-md",
            }}
          >
            Home
          </Link>
          <Link
            to="/browse"
            search={{ order: "popularity", page: 1, type: "", genre: "" }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
            activeProps={{
              className:
                "bg-white/20 font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] border border-white/25 backdrop-blur-md",
            }}
          >
            Browse
          </Link>
          <Link
            to="/browse"
            search={{ order: "airing", page: 1, type: "", genre: "" }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
            activeProps={{
              className:
                "bg-white/20 font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] border border-white/25 backdrop-blur-md",
            }}
          >
            Trending
          </Link>
          <Link
            to="/browse"
            search={{ order: "score", page: 1, type: "", genre: "" }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
            activeProps={{
              className:
                "bg-white/20 font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] border border-white/25 backdrop-blur-md",
            }}
          >
            Top Rated
          </Link>
          <Link
            to="/watchlist"
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-white/70 transition-all hover:bg-white/10 hover:text-white"
            activeProps={{
              className:
                "bg-white/20 font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.35)] border border-white/25 backdrop-blur-md",
            }}
          >
            Watchlist
          </Link>
        </nav>

        {/* Right: Search, Audio Language & Profile/Theme Dropdown */}
        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <form onSubmit={handleSearch} className="relative hidden md:block w-40 lg:w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search anime…"
              className="w-full rounded-full border border-white/15 bg-white/[0.07] py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/40 outline-none transition-all focus:bg-white/[0.14] focus:border-white/30 shadow-inner backdrop-blur-md"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/50" />
          </form>

          {/* Quick Audio Sub/Dub Toggle */}
          <div className="hidden sm:flex items-center rounded-full border border-white/15 bg-white/[0.07] p-0.5 text-[11px] font-bold shadow-sm backdrop-blur-md">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-full px-2.5 py-1 transition-all ${
                language === "en"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("jp")}
              className={`rounded-full px-2.5 py-1 transition-all ${
                language === "jp"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-white/60 hover:text-white"
              }`}
            >
              JP
            </button>
          </div>

          {/* Unified Profile & Theme Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 p-1 pr-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.25)] transition-all hover:bg-white/20 hover:border-white/30 backdrop-blur-md"
              aria-expanded={menuOpen}
              aria-label="Profile and theme settings"
            >
              {user ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-7 rounded-full object-cover ring-1 ring-white/30"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-white text-slate-950 shadow-sm">
                  <UserIcon className="size-3.5" />
                </div>
              )}
              <span className="hidden text-xs font-bold text-white md:inline-block max-w-[100px] truncate">
                {user ? displayName : "Profile"}
              </span>
              <ChevronDown className="size-3 text-white/50" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-3xl border border-white/20 bg-[#10131f]/90 p-3 shadow-[0_24px_60px_rgba(0,0,0,0.8),inset_0_1px_1.5px_rgba(255,255,255,0.25)] backdrop-blur-3xl text-white">
                  {/* Profile Header */}
                  <div className="border-b border-white/10 pb-2.5 mb-2">
                    <p className="text-xs font-bold text-white truncate">
                      {user ? displayName : "Guest Fan"}
                    </p>
                    <p className="text-[10px] text-white/50 truncate">
                      {user ? user.email : "Sign in to sync your library"}
                    </p>
                  </div>

                  {user ? (
                    <div className="space-y-0.5 py-1">
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <UserIcon className="size-3.5 text-white/50" />
                        <span>Profile & Settings</span>
                      </Link>
                      <Link
                        to="/watchlist"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Bookmark className="size-3.5 text-white/50" />
                        <span>My Watchlist</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Link
                        to="/auth"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-white py-2 text-xs font-bold text-slate-950 shadow-md transition-all hover:bg-white/90 active:scale-95"
                      >
                        Sign In / Register
                      </Link>
                    </div>
                  )}

                  {/* Theme Section Under Profile */}
                  <div className="border-t border-white/10 pt-2.5">
                    <div className="flex items-center justify-between px-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/70 uppercase">
                        <Layers className="size-3.5" />
                        <span>Theme Style</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/40 uppercase">
                        {theme === "glass" ? "Liquid Glass" : theme}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTheme(t.id);
                            setMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition-all ${
                            theme === t.id
                              ? "bg-white text-slate-950 font-bold shadow-md scale-[1.01]"
                              : "text-white/80 hover:bg-white/10 hover:text-white"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold leading-tight">{t.label}</p>
                            <p className="text-[10px] opacity-70 font-normal">{t.desc}</p>
                          </div>
                          {theme === t.id && (
                            <span className="size-1.5 rounded-full bg-slate-950 shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {user && (
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
                      >
                        <LogOut className="size-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
