import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, ChevronDown, Layers, LogOut, Menu, Search, User as UserIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LanguageToggle } from "@/components/PreferenceControls";
import { usePreferences, type ThemePref } from "@/lib/preferences";
import { profileQuery } from "@/lib/library";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/search", label: "Search" },
] as const;

const THEMES: { id: ThemePref; label: string; desc: string }[] = [
  { id: "manga", label: "Manga", desc: "Ink black & screentones" },
  { id: "glass", label: "Liquid Glass", desc: "Translucent frosted glow" },
  { id: "netflix", label: "Zenkai", desc: "Dark streaming layout" },
  { id: "shonen-jump", label: "Shonen Jump", desc: "Weekly manga magazine style" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const { theme, setTheme } = usePreferences();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const profile = useQuery(profileQuery(user?.id));

  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    navigate({ to: "/search", search: { q, page: 1 } });
  };

  const signOut = async () => {
    setProfileMenuOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  const displayName =
    profile.data?.username ??
    user?.user_metadata?.["display_name"] ??
    user?.email?.split("@")[0] ??
    "Anime Fan";

  const avatarUrl =
    profile.data?.avatar_url ??
    user?.user_metadata?.["avatar_url"] ??
    "https://api.dicebear.com/7.x/bottts/svg?seed=zenkai";

  return (
    <header
      className={`site-header sticky top-0 z-50 border-b-[3px] border-border bg-background/95 backdrop-blur-sm ${
        typeof window !== "undefined" && window.location.pathname === "/" ? "site-header--home" : ""
      }`}
    >
      <div className="mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:flex lg:gap-5">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img src="/brand-icon.webp" alt="Zenkia Anime" className="size-9 sm:hidden" />
          <img
            src="/brand-logo-light.webp"
            alt="Zenkia Anime"
            className="hidden h-10 w-auto max-w-[150px] object-contain dark:hidden sm:block"
          />
          <img
            src="/brand-logo-dark.webp"
            alt="Zenkia Anime"
            className="hidden h-10 w-auto max-w-[150px] object-contain dark:sm:block"
          />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "bg-accent text-accent-foreground" }}
              className="border-2 border-transparent px-3 py-1.5 font-mono text-xs font-bold tracking-widest uppercase hover:border-border"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form
          onSubmit={submit}
          className="ml-auto hidden w-full max-w-[420px] items-center gap-2 lg:flex"
        >
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search titles, studios, tags…"
            aria-label="Search anime"
            className="ink-panel-sm w-full bg-card px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            className="ink-panel-sm ink-press shrink-0 bg-accent p-2 text-accent-foreground"
            aria-label="Search"
          >
            <Search className="size-4" strokeWidth={3} />
          </button>
        </form>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <LanguageToggle />

          {/* Profile & Theme Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="ink-panel-sm ink-press flex items-center gap-2 bg-card px-2.5 py-1.5"
              aria-label="Profile and settings"
              aria-expanded={profileMenuOpen}
            >
              {user ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-5 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="size-4" strokeWidth={2.5} />
              )}
              <span className="font-mono text-xs font-bold tracking-wider uppercase max-w-[100px] truncate">
                {user ? displayName : "Profile"}
              </span>
              <ChevronDown className="size-3 opacity-60" />
            </button>

            {profileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="ink-panel absolute right-0 top-full z-50 mt-2 w-64 bg-card p-2 shadow-2xl">
                  {/* Profile Header */}
                  <div className="border-b-2 border-border px-3 py-2">
                    <p className="font-mono text-xs font-bold uppercase truncate">
                      {user ? displayName : "Guest Fan"}
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground truncate">
                      {user ? user.email : "Sign in to track anime & manga"}
                    </p>
                  </div>

                  {user ? (
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded px-2.5 py-1.5 font-mono text-xs font-bold uppercase hover:bg-secondary"
                      >
                        <UserIcon className="size-3.5" />
                        <span>Profile & Settings</span>
                      </Link>
                      <Link
                        to="/watchlist"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-2.5 rounded px-2.5 py-1.5 font-mono text-xs font-bold uppercase hover:bg-secondary"
                      >
                        <Bookmark className="size-3.5" />
                        <span>My Watchlist</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="py-2">
                      <Link
                        to="/auth"
                        onClick={() => setProfileMenuOpen(false)}
                        className="ink-panel-sm ink-press block w-full bg-accent py-1.5 text-center font-mono text-xs font-bold text-accent-foreground uppercase"
                      >
                        Sign in / Sign up
                      </Link>
                    </div>
                  )}

                  {/* Theme Section Under Profile */}
                  <div className="border-t-2 border-border pt-2 pb-1">
                    <div className="flex items-center justify-between px-2.5 py-1">
                      <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase">
                        <Layers className="size-3.5" />
                        <span>Theme Style</span>
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground uppercase font-bold">
                        {theme}
                      </span>
                    </div>

                    <div className="mt-1 space-y-1">
                      {THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setTheme(t.id);
                            setProfileMenuOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left transition-all ${
                            theme === t.id
                              ? "bg-accent font-bold text-accent-foreground shadow-sm"
                              : "hover:bg-secondary"
                          }`}
                        >
                          <div>
                            <p className="font-mono text-xs font-bold uppercase">{t.label}</p>
                            <p className="text-[10px] opacity-70">{t.desc}</p>
                          </div>
                          {theme === t.id && (
                            <span className="size-1.5 rounded-full bg-current" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {user && (
                    <div className="border-t-2 border-border pt-1">
                      <button
                        type="button"
                        onClick={signOut}
                        className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left font-mono text-xs font-bold text-destructive uppercase hover:bg-destructive/10"
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

        <button
          onClick={() => setOpen((v) => !v)}
          className="ink-panel-sm ink-press shrink-0 bg-card p-2 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? (
            <X className="size-4" strokeWidth={3} />
          ) : (
            <Menu className="size-4" strokeWidth={3} />
          )}
        </button>
      </div>

      {open && (
        <div className="border-t-[3px] border-border bg-card px-4 py-4 lg:hidden">
          <form onSubmit={submit} className="flex items-center gap-2">
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search anime…"
              aria-label="Search anime"
              className="ink-panel-sm w-full bg-background px-3 py-2 text-sm outline-none"
            />
            <button type="submit" className="ink-panel-sm bg-accent p-2 text-accent-foreground">
              <Search className="size-4" strokeWidth={3} />
            </button>
          </form>
          <nav className="mt-4 grid gap-2">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className="ink-panel-sm bg-background px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase"
              >
                {item.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="ink-panel-sm bg-background px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase"
                >
                  Profile & Settings
                </Link>
                <button
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="ink-panel-sm bg-background px-3 py-2 text-left font-mono text-xs font-bold tracking-widest uppercase"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="ink-panel-sm bg-accent px-3 py-2 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
              >
                Sign in
              </Link>
            )}
          </nav>

          {/* Theme Section Under Profile on Mobile */}
          <div className="mt-4 border-t-2 border-border pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold uppercase">Theme Style</span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase">{theme}</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id);
                    setOpen(false);
                  }}
                  className={`ink-panel-sm px-2.5 py-1.5 text-center font-mono text-[11px] font-bold uppercase transition-all ${
                    theme === t.id
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "bg-background"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
