import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  LogOut,
  Menu,
  User as UserIcon,
  X,
  Bookmark,
  Layers,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/library";
import { supabase } from "@/integrations/supabase/client";
import { usePreferences, type ThemePref } from "@/lib/preferences";
import { NetflixSidebar } from "./NetflixSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function NetflixHeaderBar() {
  const { user } = useAuth();
  const { theme, setTheme } = usePreferences();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const profile = useQuery(profileQuery(user?.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const displayName =
    user?.user_metadata?.["display_name"]?.trim() ||
    profile.data?.username?.trim() ||
    user?.user_metadata?.["full_name"] ||
    user?.email?.split("@")[0] ||
    "Member";

  const avatarUrl =
    profile.data?.avatar_url ||
    user?.user_metadata?.["avatar_url"] ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${displayName}`;

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-[#08090d]/80 px-4 py-3 sm:px-8 backdrop-blur-md">
      {/* Mobile Drawer Trigger & Zenkai Logo on Mobile */}
      <div className="flex items-center gap-3 lg:hidden">
        <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10"
              aria-label="Open menu"
            >
              <Menu className="size-4" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-r border-white/10 bg-[#0a0a0e] p-0 text-white">
            <NetflixSidebar />
          </SheetContent>
        </Sheet>
        <Link to="/" className="font-black text-xl tracking-tighter text-[#E50914]">
          ZENKAI
        </Link>
      </div>

      <div className="hidden lg:block">
        {/* Empty left spacing */}
      </div>

      {/* Top Right User Profile Avatar & Theme Menu */}
      <div className="relative ml-auto flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 p-1 pr-2.5 transition-all hover:bg-white/10 hover:border-white/30"
              aria-expanded={menuOpen}
              aria-label="User menu"
            >
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-7 rounded-full object-cover ring-1 ring-emerald-400"
              />
              <span className="hidden text-xs font-medium text-white sm:inline-block max-w-[120px] truncate">
                {displayName}
              </span>
              <ChevronDown className="size-3 text-white/60" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#12141a]/95 p-2 shadow-2xl backdrop-blur-2xl">
                  <div className="border-b border-white/10 px-3 py-2">
                    <p className="text-xs font-semibold text-white truncate">{displayName}</p>
                    <p className="text-[10px] text-white/50 truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <UserIcon className="size-3.5 text-white/60" />
                      <span>Profile & Settings</span>
                    </Link>

                    <Link
                      to="/watchlist"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <Bookmark className="size-3.5 text-white/60" />
                      <span>My Watchlist</span>
                    </Link>
                  </div>

                  {/* Theme Section under Profile */}
                  <div className="border-t border-b border-white/10 px-3 py-2.5 my-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-white/70 uppercase">
                        <Layers className="size-3.5 text-[#E50914]" />
                        <span>Theme Style</span>
                      </div>
                      <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">
                        {theme === "netflix" ? "Zenkai" : theme}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/50 p-1 border border-white/5">
                      {(["netflix", "glass", "manga"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`rounded-lg py-1.5 text-center text-[10px] font-bold capitalize transition-all ${
                            theme === t
                              ? "bg-white text-black shadow-md scale-[1.02]"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {t === "netflix" ? "Zenkai" : t === "glass" ? "Glass" : "Manga"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs text-[#E50914] transition-colors hover:bg-red-500/10"
                  >
                    <LogOut className="size-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 p-1.5 px-3 text-xs text-white/80 transition-all hover:bg-white/10"
                aria-label="Theme settings"
              >
                <Layers className="size-3.5 text-white/60" />
                <span className="text-[11px] font-semibold text-white/80">Theme</span>
                <ChevronDown className="size-3 text-white/60" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-[#12141a]/95 p-3 shadow-2xl backdrop-blur-2xl">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-white/70 uppercase">
                        <Layers className="size-3.5 text-[#E50914]" />
                        <span>Theme Style</span>
                      </div>
                      <span className="text-[9px] text-white/40 uppercase font-bold tracking-wider">
                        {theme === "netflix" ? "Zenkai" : theme}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-black/50 p-1 border border-white/5">
                      {(["netflix", "glass", "manga"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTheme(t)}
                          className={`rounded-lg py-1.5 text-center text-[10px] font-bold capitalize transition-all ${
                            theme === t
                              ? "bg-white text-black shadow-md scale-[1.02]"
                              : "text-white/60 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {t === "netflix" ? "Zenkai" : t === "glass" ? "Glass" : "Manga"}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Link
              to="/auth"
              className="rounded-full bg-[#E50914] px-4 py-1.5 text-xs font-bold text-white transition-transform hover:scale-105"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
