import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t-[3px] border-border bg-card">
      <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-6 px-4 py-10 sm:px-6 lg:flex-row">
        <Link to="/" aria-label="Zenkia Anime home" className="inline-flex items-center">
          <img
            src="/brand-wordmark-light.webp"
            alt="Zenkia Anime"
            className="h-10 w-auto max-w-[170px] dark:hidden"
          />
          <img
            src="/brand-wordmark.webp"
            alt="Zenkia Anime"
            className="hidden h-10 w-auto max-w-[170px] dark:block"
          />
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
          AnimeHub is an anime discovery and viewing platform. Metadata is provided by
          Jikan/MyAnimeList. External official platforms are listed where available. AnimeHub
          playback is provided through authorized embedded sources.
        </p>
      </div>
    </footer>
  );
}
