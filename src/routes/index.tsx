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
      { title: "Zenkia Anime — Discover, track and watch anime legally" },
      {
        name: "description",
        content:
          "Zenkia Anime: A Japanese-inspired anime catalogue featuring trending series, seasonal releases, genre browsing, watchlists, and episode tracking.",
      },
      { property: "og:title", content: "Zenkia Anime — Discover and track anime" },
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
        <div className="netflix-home-rail no-scrollbar flex gap-5 overflow-x-auto pb-3">
          {data.map((anime) => (
            <AnimeCard
              key={anime.mal_id}
              anime={anime}
              className="netflix-rail-card w-[150px] shrink-0 sm:w-[190px]"
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
  const { theme } = usePreferences();

  if (theme === "netflix") {
    return (
      <section className="netflix-hero relative isolate flex min-h-[68vh] items-end overflow-hidden bg-black text-white">
        {poster ? (
          <img
            src={poster}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover object-[center_20%] opacity-60"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/90 via-black/45 to-black/10" />
        <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black via-black/15 to-black/10" />
        <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-12 pt-24 sm:px-6 lg:pb-16">
          <p className="font-mono text-xs font-bold tracking-[0.24em] text-red-500 uppercase">
            {label}
          </p>
          {nav}
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[0.98] break-words sm:text-6xl lg:text-7xl">
            {title}
          </h1>
          <p className="mt-3 font-mono text-xs tracking-widest text-white/75 uppercase">
            {anime.year ?? "New series"} · {anime.type ?? "Anime"} · {anime.episodes ?? "?"} episodes
            {typeof anime.score === "number" ? ` · ★ ${anime.score.toFixed(1)}` : ""}
          </p>
          <p className="mt-4 line-clamp-3 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
            {anime.synopsis ?? "No synopsis available for this title yet."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/watch/$animeId/$episodeNumber"
              params={{ animeId: String(anime.mal_id), episodeNumber: "1" }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-black uppercase transition-colors hover:bg-white/85"
            >
              <Play className="size-4" fill="currentColor" strokeWidth={3} /> Watch now
            </Link>
            <Link
              to="/anime/$animeId"
              params={{ animeId: String(anime.mal_id) }}
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white/20 px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-white uppercase backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              More info
            </Link>
            <WatchlistButton anime={anime} />
            {sources[0] && (
              <a
                href={sources[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-white/10 px-4 py-2.5 font-mono text-xs font-bold tracking-widest text-white uppercase backdrop-blur-sm"
              >
                Official source <ExternalLink className="size-3.5" />
              </a>
            )}
          </div>
        </div>
      </section>
    );
  }


  if (theme === "glass") {
    return (
      <section className="glass-feature relative isolate mx-auto my-4 grid min-h-[min(760px,82vh)] max-w-[1500px] overflow-hidden rounded-[2rem] border border-white/40 sm:my-6 sm:rounded-[2.5rem]">
        {poster && (
          <img src={poster} alt="" aria-hidden="true" className="absolute inset-0 size-full scale-110 object-cover object-center opacity-50 blur-2xl transition-opacity duration-700" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(8,12,18,0.48),rgba(8,12,18,0.2)_54%,rgba(8,12,18,0.34))]" />
        <div className="glass-feature-layout relative z-10 grid min-h-[inherit] gap-8 p-5 sm:p-8 md:p-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-12 lg:p-16">
          <div className="flex min-w-0 flex-col justify-center">
            <span className="inline-flex w-fit items-center rounded-full border border-white/40 bg-white/15 px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/90 uppercase backdrop-blur-xl">{label}</span>
            {nav}
            <h1 className="mt-7 max-w-4xl text-5xl leading-[0.96] font-light tracking-[-0.065em] break-words text-white sm:text-6xl lg:text-8xl">{title}</h1>
            {anime.title_japanese && <p className="mt-3 font-body text-sm tracking-wide text-white/75">{anime.title_japanese}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              {[anime.year, anime.type, anime.status, anime.episodes ? `${anime.episodes} episodes` : null]
                .filter(Boolean)
                .map((item) => <span key={String(item)} className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-lg">{item}</span>)}
              {typeof anime.score === "number" && <span className="rounded-full border border-white/35 bg-white/10 px-3 py-1.5 text-xs text-white/90 backdrop-blur-lg">★ {anime.score.toFixed(1)}</span>}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/watch/$animeId/$episodeNumber" params={{ animeId: String(anime.mal_id), episodeNumber: "1" }} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-white/90"><Play className="size-4" fill="currentColor" /> Watch now</Link>
              <Link to="/anime/$animeId" params={{ animeId: String(anime.mal_id) }} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/40 bg-white/15 px-6 py-3 text-sm font-semibold text-white backdrop-blur-xl transition hover:bg-white/25">Explore details</Link>
              <WatchlistButton anime={anime} />
            </div>
          </div>
          <aside className="glass-feature-details self-end rounded-[1.75rem] border border-white/40 bg-white/15 p-5 text-white shadow-2xl backdrop-blur-2xl sm:p-7 lg:self-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-white/75 uppercase">At a glance</p>
            <h2 className="mt-3 text-2xl font-medium tracking-tight sm:text-3xl">{title}</h2>
            <p className="mt-3 line-clamp-5 text-sm leading-relaxed text-white/80 sm:text-base">{anime.synopsis ?? "Synopsis unavailable for this title."}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/30 bg-white/10 p-4"><p className="text-xs text-white/70">Rating</p><p className="mt-1 text-xl font-semibold">{anime.score?.toFixed(1) ?? "—"}<span className="ml-1 text-xs font-normal text-white/70">/ 10</span></p></div>
              <div className="rounded-2xl border border-white/30 bg-white/10 p-4"><p className="text-xs text-white/70">Format</p><p className="mt-1 text-xl font-semibold">{anime.type ?? "Anime"}</p></div>
            </div>
            {sources[0] && <a href={sources[0].url} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">Where to watch <ExternalLink className="size-4" /></a>}
          </aside>
        </div>
      </section>
    );
  }

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
  const { showHomeHistory, showHomeWatchlist, theme } = usePreferences();
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
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const name =
    user?.user_metadata?.["display_name"]?.trim() ||
    profile.data?.username?.trim() ||
    user?.user_metadata?.["full_name"] ||
    "there";
  const step = (d: number) => setIndex((i) => (i + d + featuredList.length) % featuredList.length);

  // Rotate the featured anime carousel every six seconds in every theme.
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
      {theme === "manga" && user && (
        <section
          className="welcome-home relative isolate overflow-hidden border-b-[3px] border-border"
          style={{
            background:
              "radial-gradient(ellipse at 86% 42%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 52%)",
          }}
        >
          <svg aria-hidden="true" focusable="false" viewBox="0 0 320 160" className="pointer-events-none absolute right-0 top-0 h-full w-56 text-accent opacity-40 sm:right-8 sm:w-80" fill="none">
            <path d="M330 152C260 124 211 101 153 62 111 34 69 31 18 8M221 107c-6-36-1-63 23-94M180 82c-42-2-72 13-103 43M265 128c9-34 25-57 54-75" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity=".55" />
            {[[40, 22], [151, 62], [240, 23], [77, 124], [302, 54]].map(([x, y]) => (
              <g key={`${x}-${y}`} transform={`translate(${x} ${y})`} fill="currentColor">
                <ellipse cy="-8" rx="4.5" ry="7" /><ellipse cy="8" rx="4.5" ry="7" />
                <ellipse cx="-8" rx="7" ry="4.5" /><ellipse cx="8" rx="7" ry="4.5" />
                <circle r="3" fill="var(--background)" />
              </g>
            ))}
          </svg>
          <span aria-hidden="true" className="sakura-petal-motion pointer-events-none absolute right-32 top-5 opacity-40" style={{ animationDelay: "-2s" }} />
          <span aria-hidden="true" className="sakura-petal-motion pointer-events-none absolute right-16 top-3 opacity-30" style={{ animationDelay: "-6s" }} />
          <div className="relative mx-auto max-w-[1500px] px-4 py-6 sm:px-6">
            <div className="relative z-10" aria-live="polite">
              <p className="font-display text-4xl leading-[0.95] break-words sm:text-5xl lg:text-6xl">{greeting},</p>
              <p className="mt-1 font-display text-4xl leading-[0.95] break-words sm:text-5xl lg:text-6xl">{name}</p>
            </div>
          </div>
        </section>
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
