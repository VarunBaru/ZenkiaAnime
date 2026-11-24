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
      <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-3 rounded-full border border-white/80 bg-white/75 px-4 py-2.5 shadow-[0_16px_40px_-10px_rgba(100,116,139,0.12),inset_0_1px_1.5px_#ffffff] backdrop-blur-2xl transition-all duration-300">
        {/* Left: Brand Logo & Mobile Trigger */}
        <div className="flex items-center gap-2.5">
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-full border border-white/80 bg-white/80 text-slate-700 shadow-sm lg:hidden"
                aria-label="Open Navigation"
              >
                <Menu className="size-4" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-r border-white/80 bg-white/95 p-6 backdrop-blur-3xl text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
                <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-slate-900">
                  <div className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-white">
                    <Droplets className="size-3.5" />
                  </div>
                  <span>ZENKAI</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-6 space-y-5">
                {/* Audio Dub/Sub */}
                <div>
                  <p className="mb-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
                    Audio Language
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 rounded-full border border-white/80 bg-slate-100/80 p-1">
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`rounded-full py-1.5 text-xs font-bold transition-all ${
                        language === "en"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🇬🇧 English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("jp")}
                      className={`rounded-full py-1.5 text-xs font-bold transition-all ${
                        language === "jp"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      🇯🇵 Japanese
                    </button>
                  </div>
                </div>

                {/* Mobile Links */}
                <div className="space-y-1">
                  <p className="mb-2 text-[11px] font-bold tracking-wider uppercase text-slate-500">
                    Navigation
                  </p>
                  <Link
                    to="/"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span>Home</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "popularity", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span>Browse</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "airing", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span>Trending</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "score", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span>Top Rated</span>
                  </Link>
                  <Link
                    to="/watchlist"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <span>Watchlist</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <Link to="/" className="group flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-slate-900 text-white shadow-md transition-transform group-hover:scale-105">
              <Droplets className="size-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-base sm:text-lg font-black tracking-tight text-slate-900 leading-none">
                ZENKAI
              </span>
              <span className="text-[9px] font-semibold tracking-widest text-slate-500 uppercase">
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
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_14px_-2px_rgba(100,116,139,0.1),inset_0_1px_1px_#ffffff]"
            activeProps={{
              className:
                "bg-white font-bold text-slate-950 shadow-[0_4px_14px_-2px_rgba(100,116,139,0.14),inset_0_1px_1.5px_#ffffff] border border-white/90",
            }}
          >
            Home
          </Link>
          <Link
            to="/browse"
            search={{ order: "popularity", page: 1, type: "", genre: "" }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_14px_-2px_rgba(100,116,139,0.1),inset_0_1px_1px_#ffffff]"
            activeProps={{
              className:
                "bg-white font-bold text-slate-950 shadow-[0_4px_14px_-2px_rgba(100,116,139,0.14),inset_0_1px_1.5px_#ffffff] border border-white/90",
            }}
          >
            Browse
          </Link>
          <Link
            to="/browse"
            search={{ order: "airing", page: 1, type: "", genre: "" }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_14px_-2px_rgba(100,116,139,0.1),inset_0_1px_1px_#ffffff]"
            activeProps={{
              className:
                "bg-white font-bold text-slate-950 shadow-[0_4px_14px_-2px_rgba(100,116,139,0.14),inset_0_1px_1.5px_#ffffff] border border-white/90",
            }}
          >
            Trending
          </Link>
          <Link
            to="/browse"
            search={{ order: "score", page: 1, type: "", genre: "" }}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_14px_-2px_rgba(100,116,139,0.1),inset_0_1px_1px_#ffffff]"
            activeProps={{
              className:
                "bg-white font-bold text-slate-950 shadow-[0_4px_14px_-2px_rgba(100,116,139,0.14),inset_0_1px_1.5px_#ffffff] border border-white/90",
            }}
          >
            Top Rated
          </Link>
          <Link
            to="/watchlist"
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-white hover:text-slate-900 hover:shadow-[0_4px_14px_-2px_rgba(100,116,139,0.1),inset_0_1px_1px_#ffffff]"
            activeProps={{
              className:
                "bg-white font-bold text-slate-950 shadow-[0_4px_14px_-2px_rgba(100,116,139,0.14),inset_0_1px_1.5px_#ffffff] border border-white/90",
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
              className="w-full rounded-full border border-white/80 bg-white/70 py-1.5 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-300 shadow-inner"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          </form>

          {/* Quick Audio Sub/Dub Toggle */}
          <div className="hidden sm:flex items-center rounded-full border border-white/80 bg-white/60 p-0.5 text-[11px] font-bold shadow-sm">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-full px-2.5 py-1 transition-all ${
                language === "en"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
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
                  : "text-slate-500 hover:text-slate-900"
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
              className="flex items-center gap-2 rounded-full border border-white/90 bg-white/85 p-1 pr-2.5 shadow-[0_4px_12px_-2px_rgba(100,116,139,0.1),inset_0_1px_1.5px_#ffffff] transition-all hover:bg-white hover:shadow-md"
              aria-expanded={menuOpen}
              aria-label="Profile and theme settings"
            >
              {user ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-7 rounded-full object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm">
                  <UserIcon className="size-3.5" />
                </div>
              )}
              <span className="hidden text-xs font-bold text-slate-800 md:inline-block max-w-[100px] truncate">
                {user ? displayName : "Profile"}
              </span>
              <ChevronDown className="size-3 text-slate-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-3xl border border-white/90 bg-white/90 p-3 shadow-[0_24px_50px_-12px_rgba(100,116,139,0.2),inset_0_1px_2px_#ffffff] backdrop-blur-3xl">
                  {/* Profile Header */}
                  <div className="border-b border-slate-200/80 pb-2.5 mb-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user ? displayName : "Guest Fan"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {user ? user.email : "Sign in to sync your library"}
                    </p>
                  </div>

                  {user ? (
                    <div className="space-y-0.5 py-1">
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                      >
                        <UserIcon className="size-3.5 text-slate-500" />
                        <span>Profile & Settings</span>
                      </Link>
                      <Link
                        to="/watchlist"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950"
                      >
                        <Bookmark className="size-3.5 text-slate-500" />
                        <span>My Watchlist</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Link
                        to="/auth"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
                      >
                        Sign In / Register
                      </Link>
                    </div>
                  )}

                  {/* Theme Section Under Profile */}
                  <div className="border-t border-slate-200/80 pt-2.5">
                    <div className="flex items-center justify-between px-2 mb-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase">
                        <Layers className="size-3.5" />
                        <span>Theme Style</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
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
                              ? "bg-slate-900 text-white font-bold shadow-md scale-[1.01]"
                              : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold leading-tight">{t.label}</p>
                            <p className="text-[10px] opacity-70 font-normal">{t.desc}</p>
                          </div>
                          {theme === t.id && (
                            <span className="size-1.5 rounded-full bg-white shadow-sm" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {user && (
                    <div className="border-t border-slate-200/80 pt-2 mt-2">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-left text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
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
