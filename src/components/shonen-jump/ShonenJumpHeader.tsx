import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Compass,
  Flame,
  Layers,
  LogOut,
  Menu,
  Search,
  Sparkles,
  Trophy,
  User as UserIcon,
  X,
  Bookmark,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences, type ThemePref } from "@/lib/preferences";
import { ShonenJumpLogo } from "./ShonenJumpLogo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const THEMES: { id: ThemePref; label: string; desc: string }[] = [
  { id: "shonen-jump", label: "Shonen Jump", desc: "Weekly manga magazine style" },
  { id: "netflix", label: "Zenkai", desc: "Dark streaming layout" },
  { id: "glass", label: "Liquid Glass", desc: "Translucent frosted glow" },
  { id: "manga", label: "Manga", desc: "Ink black & screentones" },
];

export function ShonenJumpHeader() {
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
    "Jump Fan";

  const avatarUrl =
    profile.data?.avatar_url ??
    user?.user_metadata?.["avatar_url"] ??
    "https://api.dicebear.com/7.x/bottts/svg?seed=jump";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0c0d12]/90 backdrop-blur-xl px-4 py-3 sm:px-8">
      <div className="mx-auto flex max-w-[1700px] items-center justify-between gap-4">
        {/* Left: Shonen Jump Logo + Mobile Menu Trigger */}
        <div className="flex items-center gap-3">
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
                aria-label="Open Navigation"
              >
                <Menu className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-72 border-r border-white/10 bg-[#0c0d12] p-5 text-white"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <ShonenJumpLogo />
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {/* Audio Language Switch */}
                <div>
                  <p className="mb-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#FFCC00]">
                    Audio Language
                  </p>
                  <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                    <button
                      type="button"
                      onClick={() => setLanguage("en")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                        language === "en"
                          ? "bg-[#E60012] text-white shadow-md font-black"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <span>🇬🇧</span> English
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage("jp")}
                      className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-bold transition-all ${
                        language === "jp"
                          ? "bg-[#E60012] text-white shadow-md font-black"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      <span>🇯🇵</span> Japanese
                    </button>
                  </div>
                </div>

                {/* Navigation Links */}
                <div className="space-y-1">
                  <p className="mb-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#FFCC00]">
                    Jump Magazine
                  </p>
                  <Link
                    to="/"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Flame className="size-4 text-[#FFCC00]" />
                    <span>Weekly Jump</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "score", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Trophy className="size-4 text-[#FFCC00]" />
                    <span>Top Rankings</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "popularity", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Sparkles className="size-4 text-[#FFCC00]" />
                    <span>Popular</span>
                  </Link>
                  <Link
                    to="/browse"
                    search={{ order: "airing", page: 1, type: "", genre: "" }}
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Compass className="size-4 text-[#FFCC00]" />
                    <span>Simulcasts</span>
                  </Link>
                  <Link
                    to="/watchlist"
                    onClick={() => setMobileDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Bookmark className="size-4 text-[#FFCC00]" />
                    <span>Watchlist</span>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          <ShonenJumpLogo />
        </div>

        {/* Center: Desktop Magazine Nav Pills */}
        <nav className="hidden items-center gap-1.5 lg:flex">
          <Link
            to="/"
            className="group flex items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-bold text-white/80 transition-all hover:border-[#E60012]/40 hover:bg-white/5 hover:text-white"
            activeProps={{
              className:
                "bg-[#E60012] text-white shadow-[0_0_15px_rgba(230,0,18,0.4)] border-[#E60012]",
            }}
          >
            <Flame className="size-3.5 transition-transform group-hover:scale-110" />
            <span>Weekly Jump</span>
          </Link>
          <Link
            to="/browse"
            search={{ order: "score", page: 1, type: "", genre: "" }}
            className="group flex items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-bold text-white/80 transition-all hover:border-[#E60012]/40 hover:bg-white/5 hover:text-white"
            activeProps={{
              className:
                "bg-[#E60012] text-white shadow-[0_0_15px_rgba(230,0,18,0.4)] border-[#E60012]",
            }}
          >
            <Trophy className="size-3.5 transition-transform group-hover:scale-110" />
            <span>Top Rankings</span>
          </Link>
          <Link
            to="/browse"
            search={{ order: "popularity", page: 1, type: "", genre: "" }}
            className="group flex items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-bold text-white/80 transition-all hover:border-[#E60012]/40 hover:bg-white/5 hover:text-white"
            activeProps={{
              className:
                "bg-[#E60012] text-white shadow-[0_0_15px_rgba(230,0,18,0.4)] border-[#E60012]",
            }}
          >
            <Sparkles className="size-3.5 transition-transform group-hover:scale-110" />
            <span>Popular</span>
          </Link>
          <Link
            to="/browse"
            search={{ order: "airing", page: 1, type: "", genre: "" }}
            className="group flex items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-bold text-white/80 transition-all hover:border-[#E60012]/40 hover:bg-white/5 hover:text-white"
            activeProps={{
              className:
                "bg-[#E60012] text-white shadow-[0_0_15px_rgba(230,0,18,0.4)] border-[#E60012]",
            }}
          >
            <Compass className="size-3.5 transition-transform group-hover:scale-110" />
            <span>Simulcasts</span>
          </Link>
          <Link
            to="/watchlist"
            className="group flex items-center gap-2 rounded-full border border-transparent px-3.5 py-1.5 text-xs font-bold text-white/80 transition-all hover:border-[#E60012]/40 hover:bg-white/5 hover:text-white"
            activeProps={{
              className:
                "bg-[#E60012] text-white shadow-[0_0_15px_rgba(230,0,18,0.4)] border-[#E60012]",
            }}
          >
            <Bookmark className="size-3.5 transition-transform group-hover:scale-110" />
            <span>Watchlist</span>
          </Link>
        </nav>

        {/* Right: Search, Language & Profile / Theme */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          {/* Quick Search */}
          <form onSubmit={handleSearch} className="relative hidden md:block w-44 lg:w-56">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Jump anime…"
              className="w-full rounded-full border border-white/10 bg-white/5 py-1.5 pl-8 pr-3 text-xs text-white placeholder-white/40 outline-none transition-all focus:border-[#E60012] focus:bg-black/50 focus:ring-1 focus:ring-[#E60012]"
            />
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-white/50" />
          </form>

          {/* Quick Audio Sub/Dub Toggle */}
          <div className="hidden sm:flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setLanguage("en")}
              className={`rounded-full px-2.5 py-1 transition-all ${
                language === "en" ? "bg-[#E60012] text-white shadow-sm font-black" : "text-white/60 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage("jp")}
              className={`rounded-full px-2.5 py-1 transition-all ${
                language === "jp" ? "bg-[#E60012] text-white shadow-sm font-black" : "text-white/60 hover:text-white"
              }`}
            >
              JP
            </button>
          </div>

          {/* Profile & Theme Dropdown Menu */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 pr-2.5 transition-all hover:border-[#FFCC00] hover:bg-white/10"
              >
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-7 rounded-full object-cover ring-2 ring-[#E60012]"
                />
                <span className="hidden text-xs font-bold text-white md:inline-block max-w-[90px] truncate">
                  {displayName}
                </span>
                <ChevronDown className="size-3.5 text-white/60" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-white/10 bg-[#12141a]/95 p-2 shadow-2xl backdrop-blur-2xl">
                    <div className="border-b border-white/10 px-3 py-2">
                      <p className="text-xs font-bold text-white truncate">{displayName}</p>
                      <p className="text-[10px] text-white/50 truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <UserIcon className="size-3.5 text-[#FFCC00]" />
                        <span>Profile & Preferences</span>
                      </Link>

                      <Link
                        to="/watchlist"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        <Bookmark className="size-3.5 text-[#FFCC00]" />
                        <span>My Jump Watchlist</span>
                      </Link>
                    </div>

                    {/* Theme Selector Inside Profile Dropdown */}
                    <div className="border-t border-white/10 pt-2 pb-1">
                      <div className="px-3 py-1 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FFCC00]">
                          <Layers className="size-3.5" />
                          <span>Website Theme</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/40 uppercase">
                          {theme === "shonen-jump" ? "Shonen Jump" : theme}
                        </span>
                      </div>
                      <div className="mt-1 space-y-0.5 px-1">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTheme(t.id);
                              setMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-all ${
                              theme === t.id
                                ? "bg-[#E60012] text-white font-bold shadow-md"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <div>
                              <p className="leading-tight">{t.label}</p>
                              <p className="text-[10px] opacity-60 font-normal">{t.desc}</p>
                            </div>
                            {theme === t.id && (
                              <span className="size-1.5 rounded-full bg-[#FFCC00]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-1">
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                      >
                        <LogOut className="size-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 pr-2.5 transition-all hover:bg-white/10 hover:border-[#FFCC00]"
                aria-expanded={menuOpen}
                aria-label="Guest Profile and Theme"
              >
                <div className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white/80 ring-1 ring-[#E60012]">
                  <UserIcon className="size-3.5 text-[#FFCC00]" />
                </div>
                <span className="text-xs font-bold text-white">Profile</span>
                <ChevronDown className="size-3 text-white/60" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-60 rounded-2xl border border-white/10 bg-[#12141a]/95 p-3 shadow-2xl backdrop-blur-2xl">
                    <div className="border-b border-white/10 pb-2 mb-2">
                      <p className="text-xs font-bold text-white">Guest Fan</p>
                      <p className="text-[10px] text-white/50">Sign in to track Jump manga & anime</p>
                    </div>

                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#E60012] px-3 py-2 text-xs font-black uppercase text-white shadow-md hover:bg-red-600 transition-colors mb-2.5"
                    >
                      Sign In / Register
                    </Link>

                    {/* Theme Selector Under Profile */}
                    <div className="border-t border-white/10 pt-2">
                      <div className="px-1 flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#FFCC00]">
                          <Layers className="size-3.5" />
                          <span>Website Theme</span>
                        </div>
                        <span className="text-[10px] font-mono text-white/40 uppercase">
                          {theme === "shonen-jump" ? "Shonen Jump" : theme}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {THEMES.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setTheme(t.id);
                              setMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-all ${
                              theme === t.id
                                ? "bg-[#E60012] text-white font-bold shadow-md"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
                          >
                            <div>
                              <p className="leading-tight">{t.label}</p>
                              <p className="text-[10px] opacity-60 font-normal">{t.desc}</p>
                            </div>
                            {theme === t.id && (
                              <span className="size-1.5 rounded-full bg-[#FFCC00]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
