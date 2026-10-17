import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, Play, Star } from "lucide-react";
import { useState, useEffect } from "react";
import {
  genresQuery,
  popularQuery,
  posterOf,
  seasonQuery,
  trendingQuery,
  legalSources,
  type Anime,
} from "@/lib/jikan";
import { AnimeCard } from "@/components/AnimeCard";
import { WatchlistButton } from "@/components/WatchlistButton";
import { CardSkeletonRow, EmptyState, ErrorState, PanelSkeleton } from "@/components/states";
import { ContinueWatching } from "@/components/ContinueWatching";
import { HomeWatchlist } from "@/components/HomeWatchlist";
import { AuthForm } from "@/components/AuthForm";
import { useAuth } from "@/hooks/useAuth";
import { profileQuery } from "@/lib/library";
import { usePreferences } from "@/lib/preferences";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AnimeHub — Discover, track and watch anime legally" },
      {
        name: "description",
        content:
          "A manga-styled anime catalogue: trending and popular series, seasonal releases, genre browsing, watchlists and episode tracking.",
      },
      { property: "og:title", content: "AnimeHub — Discover and track anime" },
      {
        property: "og:description",
        content: "Trending, popular and seasonal anime with watchlists and official viewing links.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function SectionHeading({ title, to }: { title: string; to?: string | undefined }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 className="font-display text-xl tracking-tight sm:text-2xl">{title}</h2>
      {to && (
        <Link
          to={to}
          className="shrink-0 font-mono text-[11px] font-bold tracking-widest uppercase hover:text-accent"
        >
          View all →
        </Link>
      )}
    </div>
  );
}

function Rail({
  title,
  to,
  query,
}: {
  title: string;
  to?: string | undefined;
  query: ReturnType<typeof trendingQuery>;
}) {
  const { data, isPending, isError, refetch } = useQuery(query);

  return (
    <section className="pt-10">
      <SectionHeading title={title} to={to} />
      {isPending ? (
        <CardSkeletonRow />
      ) : isError ? (
        <ErrorState message="We couldn't load these titles." onRetry={() => refetch()} />
      ) : data.length === 0 ? (
        <EmptyState title="Nothing here yet" message="No titles were returned for this section." />
      ) : (
        <div className="no-scrollbar flex gap-5 overflow-x-auto pb-3">
          {data.map((anime) => (
            <AnimeCard
              key={anime.mal_id}
              anime={anime}
              className="w-[150px] shrink-0 sm:w-[190px]"
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Hero({
  anime,
  nav,
  label = "Featured · Now airing",
}: {
  anime: Anime;
  nav?: React.ReactNode;
  label?: string;
}) {
  const poster = posterOf(anime, true);
  const title = anime.title_english || anime.title;
  const sources = legalSources(anime);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-12 lg:py-12">
      <div className="ink-rise lg:col-span-7">
        <span className="ink-panel-sm inline-block bg-accent px-3 py-1 font-mono text-[11px] font-bold tracking-[0.2em] text-accent-foreground uppercase">
          {label}
        </span>
        {nav}
        <h1 className="mt-5 font-display text-4xl leading-[0.95] break-words sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        {anime.title_japanese && (
          <p className="mt-2 font-mono text-xs tracking-widest text-muted-foreground">
            {anime.title_japanese}
          </p>
        )}
        <p className="mt-4 line-clamp-4 max-w-[52ch] text-sm text-pretty sm:text-base">
          {anime.synopsis ?? "No synopsis available for this title yet."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-widest uppercase">
          {typeof anime.score === "number" && (
            <span className="border-2 border-border bg-accent px-2.5 py-1 text-accent-foreground">
              <Star className="mr-1 inline size-3 -translate-y-px" strokeWidth={3} />
              {anime.score.toFixed(1)}
            </span>
          )}
          {[anime.year, anime.type, anime.rating?.split(" ")[0], `${anime.episodes ?? "?"} eps`]
            .filter(Boolean)
            .map((chip) => (
              <span key={String(chip)} className="border-2 border-border px-2.5 py-1">
                {chip}
              </span>
            ))}
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            to="/watch/$animeId/$episodeNumber"
            params={{ animeId: String(anime.mal_id), episodeNumber: "1" }}
            className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            <Play className="size-4" fill="currentColor" strokeWidth={3} /> Watch now
          </Link>
          <Link
            to="/anime/$animeId"
            params={{ animeId: String(anime.mal_id) }}
            className="ink-panel-sm ink-press bg-accent px-5 py-3 font-mono text-xs font-bold tracking-widest text-accent-foreground uppercase"
          >
            Read details
          </Link>
          {sources[0] && (
            <a
              href={sources[0].url}
              target="_blank"
              rel="noopener noreferrer"
              className="ink-panel-sm ink-press inline-flex items-center gap-2 bg-card px-5 py-3 font-mono text-xs font-bold tracking-widest uppercase"
            >
              Watch official source <ExternalLink className="size-3.5" strokeWidth={3} />
            </a>
          )}
          <WatchlistButton anime={anime} />
        </div>
      </div>

      <div className="ink-rise lg:col-span-5">
        <div className="ink-panel halftone relative mx-auto max-w-[320px] p-2.5">
          {poster ? (
            <img
              src={poster}
              alt={`${title} key visual`}
              className="aspect-3/4 w-full object-cover"
            />
          ) : (
            <div className="grid aspect-3/4 w-full place-items-center bg-muted">No art</div>
          )}
        </div>
        <div className="speech-bubble mx-auto mt-8 max-w-[320px] p-4">
          <p className="font-display text-sm leading-snug">
            Build your list — then watch it on an official platform!
          </p>
        </div>
      </div>
    </div>
  );
}

function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const { showHomeHistory, showHomeWatchlist } = usePreferences();
  const profile = useQuery(profileQuery(user?.id));
  const trending = useQuery(trendingQuery());
  const popular = useQuery(popularQuery());
  const season = useQuery(seasonQuery());
  const genres = useQuery(genresQuery());
  // Featured prefers the cached airing list, then real catalogue results if it
  // is unavailable. The shared query keys keep the rails from duplicating calls.
  const airing = (trending.data ?? []).slice(0, 8);
  const fallbackFeatured = [...(popular.data ?? []), ...(season.data ?? [])].filter(
    (anime, index, list) => list.findIndex((entry) => entry.mal_id === anime.mal_id) === index,
  );
  const featuredList = airing.length > 0 ? airing : fallbackFeatured;
  const usingFallback = airing.length === 0 && featuredList.length > 0;
  const [index, setIndex] = useState(0);
  const featured = featuredList.length ? featuredList[index % featuredList.length] : undefined;
  const featuredCount = featuredList.length;
  const step = (d: number) => setIndex((i) => (i + d + featuredList.length) % featuredList.length);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name =
    user?.user_metadata?.["display_name"]?.trim() ||
    profile.data?.username?.trim() ||
    user?.user_metadata?.["full_name"] ||
    "there";

  // Auto-slide effect
  useEffect(() => {
    if (featuredCount <= 1) return;
    const interval = setInterval(() => {
      setIndex((i) => (i + 1) % featuredCount);
    }, 6000);
    return () => clearInterval(interval);
  }, [featuredCount]);

  const nav =
    featuredList.length > 1 ? (
      <div className="mt-4 flex items-center gap-2 font-mono text-[11px] font-bold tracking-widest uppercase">
        <button
          aria-label="Previous featured anime"
          onClick={() => step(-1)}
          className="ink-panel-sm ink-press bg-card p-1.5"
        >
          <ChevronLeft className="size-4" strokeWidth={3} />
        </button>
        <span>
          {(index % featuredList.length) + 1} / {featuredList.length}
        </span>
        <button
          aria-label="Next featured anime"
          onClick={() => step(1)}
          className="ink-panel-sm ink-press bg-card p-1.5"
        >
          <ChevronRight className="size-4" strokeWidth={3} />
        </button>
      </div>
    ) : null;

  return (
    <div>
      {!authLoading && !user && (
        <div className="border-b-[3px] border-border bg-secondary/40">
          <div className="mx-auto max-w-[1500px] px-4 py-3 sm:px-6">
            <p className="mb-2 text-center font-display text-lg">
              New to ZenkiaAnime? Create your account to get started.
            </p>
            <AuthForm initialMode="signup" />
          </div>
        </div>
      )}
      {user && (
        <div className="mx-auto max-w-[1500px] px-4 pt-6 sm:px-6">
          <p className="font-display text-3xl leading-tight sm:text-4xl" aria-live="polite">
            {greeting},
          </p>
          <p className="mt-1 font-display text-2xl leading-tight sm:text-3xl">{name}</p>
        </div>
      )}
      <section className="speed-lines border-b-[3px] border-border">
        {trending.isPending && !featured ? (
          <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-10 sm:px-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <div className="h-6 w-40 animate-pulse bg-muted" />
              <div className="h-14 w-3/4 animate-pulse bg-muted" />
              <div className="h-20 w-full animate-pulse bg-muted" />
            </div>
            <PanelSkeleton className="mx-auto aspect-3/4 w-full max-w-[320px] lg:col-span-5" />
          </div>
        ) : trending.isError && !featured ? (
          <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
            <ErrorState
              title="Couldn't reach the anime database"
              message="The catalogue service didn't respond. It may be rate-limited — try again in a moment."
              onRetry={() => {
                void trending.refetch();
                if (!popular.data?.length) void popular.refetch();
                if (!season.data?.length) void season.refetch();
              }}
            />
          </div>
        ) : featured ? (
          <Hero
            key={featured.mal_id}
            anime={featured}
            nav={nav}
            {...(usingFallback ? { label: "Featured · AnimeHub pick" } : {})}
          />
        ) : (
          <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
            <EmptyState
              title="No featured anime"
              message="Nothing is airing in the catalogue right now."
            />
          </div>
        )}
      </section>

      <div className="mx-auto max-w-[1500px] px-4 pb-8 sm:px-6">
        {showHomeHistory && <ContinueWatching />}
        {showHomeWatchlist && <HomeWatchlist />}
        <Rail title="Trending now" to="/browse" query={trendingQuery()} />
        <Rail title="Popular anime" to="/browse" query={popularQuery()} />
        <Rail title="This season" to="/browse" query={seasonQuery()} />

        <section className="pt-12">
          <SectionHeading title="Browse by genre" to="/browse" />
          {genres.isPending ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <PanelSkeleton key={i} className="h-20" />
              ))}
            </div>
          ) : genres.isError ? (
            <ErrorState message="Genres couldn't be loaded." onRetry={() => genres.refetch()} />
          ) : genres.data.length === 0 ? (
            <EmptyState title="No genres" message="The genre list came back empty." />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {genres.data.slice(0, 12).map((genre) => (
                <Link
                  key={genre.mal_id}
                  to="/browse"
                  search={{ genre: String(genre.mal_id), page: 1, type: "", order: "popularity" }}
                  className="ink-panel-sm ink-press halftone p-4"
                >
                  <p className="font-display text-base">{genre.name}</p>
                  <p className="mt-1 font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {genre.count?.toLocaleString() ?? "—"} titles
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
