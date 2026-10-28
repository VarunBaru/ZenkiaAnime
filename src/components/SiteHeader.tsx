import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Menu, Search, User as UserIcon, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageToggle, MobileSettings, ThemeSelect } from "@/components/PreferenceControls";
import { profileQuery } from "@/lib/library";
import { usePreferences } from "@/lib/preferences";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/search", label: "Search" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const { theme } = usePreferences();
  const profile = useQuery(profileQuery(user?.id));
  const avatarUrl =
    profile.data?.avatar_url ||
    user?.user_metadata?.["avatar_url"] ||
    user?.user_metadata?.["picture"] ||
    null;
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    navigate({ to: "/search", search: { q, page: 1 } });
  };


  return (
    <header className="site-header sticky top-0 z-50 border-b-[3px] border-border bg-background/95 backdrop-blur-sm">
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
          {theme === "netflix" && user && (
            <>
              <Link to="/profile" onClick={() => setOpen(false)}>My Library</Link>
              <Link to="/watchlist">My List</Link>
              <Link to="/history">Continue Watching</Link>
            </>
          )}
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
          <ThemeSelect />
          {user ? (
            <>
              <Link
                to="/profile"
                className="ink-panel-sm ink-press grid size-10 shrink-0 place-items-center overflow-hidden bg-card p-0"
                aria-label="Profile"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <UserIcon className="size-4" strokeWidth={2.5} />
                )}
              </Link>
              
            </>
          ) : (
            <Link
              to="/auth"
              className="ink-panel-sm ink-press bg-accent px-4 py-2 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
            >
              Sign in
            </Link>
          )}
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="ink-panel-sm ink-press shrink-0 bg-card p-2 lg:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-site-menu"
        >
          {open ? (
            <X className="size-4" strokeWidth={3} />
          ) : (
            <Menu className="size-4" strokeWidth={3} />
          )}
        </button>
      </div>

      {open && (
        <div id="mobile-site-menu" className="border-t-[3px] border-border bg-card px-4 py-4 lg:hidden">
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
            {theme === "netflix" && user && (
              <>
                <Link to="/profile" onClick={() => setOpen(false)}>My Library</Link>
                <Link to="/watchlist" onClick={() => setOpen(false)}>My List</Link>
                <Link to="/history" onClick={() => setOpen(false)}>Continue watching</Link>
              </>
            )}
            {user ? (
              <Link
                to="/profile"
                onClick={() => setOpen(false)}
                className="ink-panel-sm bg-background px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase"
              >
                Profile
              </Link>
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
          <MobileSettings />
        </div>
      )}
    </header>
  );
}
