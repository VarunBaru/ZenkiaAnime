import { useState } from "react";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BookMarked, History, LogOut, Menu, Search, User as UserIcon, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { LanguageToggle, MobileSettings, ThemeToggle } from "@/components/PreferenceControls";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/browse", label: "Browse" },
  { to: "/search", label: "Search" },
] as const;

export function SiteHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    setOpen(false);
    navigate({ to: "/search", search: { q, page: 1 } });
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };

  return (
    <header className="sticky top-0 z-50 border-b-[3px] border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto grid max-w-[1500px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:flex lg:gap-5">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <span className="ink-panel-sm bg-accent px-2 py-1 font-display text-lg leading-none text-accent-foreground">
            A
          </span>
          <span className="truncate font-display text-xl leading-none tracking-tight sm:text-2xl">
            ANIMEHUB
          </span>
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

        <form onSubmit={submit} className="ml-auto hidden w-full max-w-[420px] items-center gap-2 lg:flex">
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
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/watchlist"
                className="ink-panel-sm ink-press bg-card p-2"
                aria-label="My watchlist"
              >
                <BookMarked className="size-4" strokeWidth={2.5} />
              </Link>
              <Link
                to="/history"
                className="ink-panel-sm ink-press bg-card p-2"
                aria-label="Watch history"
              >
                <History className="size-4" strokeWidth={2.5} />
              </Link>
              <Link to="/profile" className="ink-panel-sm ink-press bg-card p-2" aria-label="Profile">
                <UserIcon className="size-4" strokeWidth={2.5} />
              </Link>
              <button
                onClick={signOut}
                className="ink-panel-sm ink-press bg-card p-2"
                aria-label="Sign out"
              >
                <LogOut className="size-4" strokeWidth={2.5} />
              </button>
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
        >
          {open ? <X className="size-4" strokeWidth={3} /> : <Menu className="size-4" strokeWidth={3} />}
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
                  to="/watchlist"
                  onClick={() => setOpen(false)}
                  className="ink-panel-sm bg-background px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase"
                >
                  Watchlist
                </Link>
                <Link
                  to="/history"
                  onClick={() => setOpen(false)}
                  className="ink-panel-sm bg-background px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase"
                >
                  History
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="ink-panel-sm bg-background px-3 py-2 font-mono text-xs font-bold tracking-widest uppercase"
                >
                  Profile
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
          <MobileSettings />
        </div>
      )}
    </header>
  );
}
