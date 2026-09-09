import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-[3px] border-border bg-card">
      <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 lg:flex-row">
        <Link to="/" className="font-display text-2xl tracking-tight">
          ANIMEHUB
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          <Link
            to="/browse"
            search={{ genre: "", type: "", order: "popularity", page: 1 }}
            className="hover:text-foreground"
          >
            Browse
          </Link>
          <Link to="/search" search={{ q: "", page: 1 }} className="hover:text-foreground">
            Search
          </Link>
          <Link to="/watchlist" className="hover:text-foreground">
            Watchlist
          </Link>
          <Link to="/auth" className="hover:text-foreground">
            Sign in
          </Link>
        </nav>
        <p className="max-w-[36ch] text-center font-mono text-[11px] text-muted-foreground lg:text-right">
          A catalogue, not a streaming service. Metadata from Jikan/MyAnimeList; episodes only ever
          link out to official licensed platforms.
        </p>
      </div>
    </footer>
  );
}
