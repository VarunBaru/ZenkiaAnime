import { queryOptions } from "@tanstack/react-query";

/**
 * Jikan API service layer (unofficial MyAnimeList metadata API).
 * Metadata only — AnimeHub never hosts, mirrors or streams episodes.
 */

const BASE = "/api/public/jikan";

export type AnimeImage = {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; large_image_url?: string };
};

export type Anime = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  source?: string | null;
  licensors?: { mal_id: number; name: string }[];
  synopsis?: string | null;
  images?: AnimeImage;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  year?: number | null;
  type?: string | null;
  episodes?: number | null;
  status?: string | null;
  duration?: string | null;
  rating?: string | null;
  season?: string | null;
  aired?: { from?: string | null; to?: string | null; string?: string | null };
  genres?: { mal_id: number; name: string }[];
  themes?: { mal_id: number; name: string }[];
  studios?: { mal_id: number; name: string }[];
  producers?: { mal_id: number; name: string }[];
  streaming?: { name: string; url: string }[];
  external?: { name: string; url: string }[];
  url?: string;
  trailer?: { url?: string | null; youtube_id?: string | null } | null;
};

export type Character = {
  character: { mal_id: number; name: string; images?: AnimeImage };
  role: string;
  voice_actors?: { person: { name: string }; language: string }[];
};

export type Episode = {
  mal_id: number;
  title: string;
  title_japanese?: string | null;
  aired?: string | null;
  filler?: boolean;
  recap?: boolean;
};

export type Genre = { mal_id: number; name: string; count?: number };

export type Pagination = {
  last_visible_page: number;
  has_next_page: boolean;
  current_page: number;
};

export class JikanError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "JikanError";
    this.status = status;
  }
}

type JikanPayloadError = {
  error?: string;
  upstreamStatus?: number;
  degraded?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Jikan rate-limits at ~3 requests/second. All calls go through one queue that
 * spaces requests out, so parallel page sections never trip the limiter.
 */
const MIN_GAP_MS = 120;
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const result = await job();
    await sleep(MIN_GAP_MS);
    return result;
  });
  queue = run.catch(() => undefined);
  return run as Promise<T>;
}

/** Fetch with retry/backoff — Jikan rate-limits at ~3 req/sec. */
async function request<T>(path: string, attempt = 0): Promise<T> {
  let res: Response;
  try {
    res = await enqueue(() =>
      fetch(`${BASE}${path}`, {
        headers: { Accept: "application/json" },
        // A hung upstream request must never stall the shared queue.
        signal: AbortSignal.timeout(9000),
      }),
    );
  } catch {
    if (attempt < 1) {
      await sleep(600 * (attempt + 1));
      return request<T>(path, attempt + 1);
    }
    throw new JikanError("Could not reach the anime database. Check your connection.", 0);
  }

  if (res.status === 429 && attempt < 2) {
    await sleep(1200 * (attempt + 1) + Math.random() * 400);
    return request<T>(path, attempt + 1);
  }
  if (res.status === 404) throw new JikanError("We couldn't find that anime.", 404);
  if (!res.ok) {
    // Jikan's upstream intermittently returns 502/503/504; the same request
    // usually succeeds within a few retries.
    if (attempt < 1 && res.status >= 500) {
      await sleep(300 * (attempt + 1) + Math.random() * 200);
      return request<T>(path, attempt + 1);
    }
    throw new JikanError("The anime database is having trouble right now.", res.status);
  }
  const payload = (await res.json()) as T & JikanPayloadError;
  if (payload.degraded || payload.error) {
    throw new JikanError(
      payload.error || "The anime database is having trouble right now.",
      payload.upstreamStatus ?? 503,
    );
  }
  return payload;
}

export function posterOf(anime: Pick<Anime, "images">, large = false) {
  const jpg = anime.images?.jpg;
  const webp = anime.images?.webp;
  return (
    (large ? webp?.large_image_url || jpg?.large_image_url : undefined) ||
    webp?.image_url ||
    jpg?.image_url ||
    jpg?.large_image_url ||
    null
  );
}

/**
 * Remove duplicate mal_ids (Jikan pages can repeat entries) and drop adult
 * titles. Filtering happens here rather than through Jikan's `sfw` query
 * parameter, which currently makes their edge return 504s.
 */
function clean(list: Anime[]) {
  const seen = new Set<number>();
  return list.filter((a) => {
    if (seen.has(a.mal_id)) return false;
    seen.add(a.mal_id);
    const rating = a.rating ?? "";
    if (rating.startsWith("Rx")) return false;
    return !(a.genres ?? []).some((g) => ["Hentai", "Erotica"].includes(g.name));
  });
}

export type EpisodeDiagnostics = {
  pagesReported: number;
  pagesFetched: number;
  failedPages: number[];
  rawCount: number;
  uniqueCount: number;
};

/** Per-anime record of what the last episode walk actually retrieved. */
export const episodeDiagnostics = new Map<number, EpisodeDiagnostics>();

export const jikan = {
  async top(filter: "airing" | "bypopularity" | "favorite", limit = 12) {
    const data = await request<{ data: Anime[] }>(`/top/anime?filter=${filter}&limit=${limit}`);
    return clean(data.data ?? []);
  },
  async seasonNow(limit = 12) {
    const data = await request<{ data: Anime[] }>(`/seasons/now?limit=${limit}`);
    return clean(data.data ?? []);
  },
  async search(params: {
    q?: string;
    genre?: string;
    genreName?: string;
    type?: string;
    orderBy?: string;
    page?: number;
    limit?: number;
  }) {
    const sp = new URLSearchParams({ limit: String(params.limit ?? 24) });
    if (params.q) sp.set("q", params.q);
    if (params.genre) sp.set("genres", params.genre);
    if (params.type) sp.set("type", params.type);
    if (params.orderBy) {
      sp.set("order_by", params.orderBy);
      sp.set("sort", params.orderBy === "title" ? "asc" : "desc");
    }
    if (params.page) sp.set("page", String(params.page));
    try {
      const data = await request<{ data: Anime[]; pagination: Pagination }>(`/anime?${sp}`);
      return { items: clean(data.data ?? []), pagination: data.pagination };
    } catch (err) {
      // MyAnimeList's search endpoint is often unavailable — fall back to the
      // Kitsu catalogue so browse and search keep working.
      try {
        const { kitsuSearch } = await import("./kitsu");
        const fallback = await kitsuSearch({ ...params, limit: Math.min(params.limit ?? 20, 20) });
        return { items: clean(fallback.items), pagination: fallback.pagination };
      } catch {
        // Both catalogues are down: degrade to an empty result set so the page
        // renders its empty state instead of blanking out.
        console.warn("[jikan] search unavailable", err);
        return {
          items: [] as Anime[],
          pagination: {
            last_visible_page: 1,
            has_next_page: false,
            current_page: params.page ?? 1,
          } as Pagination,
        };
      }
    }

  },
  async genres() {
    const data = await request<{ data: Genre[] }>(`/genres/anime`);
    return data.data ?? [];
  },
  async detail(id: number) {
    const data = await request<{ data: Anime }>(`/anime/${id}/full`);
    return data.data;
  },
  // Secondary sections: never fail the page when upstream is flaky.
  async characters(id: number) {
    try {
      const data = await request<{ data: Character[] }>(`/anime/${id}/characters`);
      return (data.data ?? []).slice(0, 18);
    } catch {
      return [] as Character[];
    }
  },
  /**
   * Jikan paginates episodes (100 per page). Every page Jikan reports is
   * fetched; a page that keeps failing is retried again at the end instead of
   * truncating the list. No episode is ever filtered out here — filler, recap,
   * untitled and un-aired entries are all preserved; only exact duplicate
   * mal_ids (Jikan repeats entries across page boundaries) are dropped.
   */
  async episodes(id: number) {
    const all: Episode[] = [];
    const failedPages: number[] = [];
    let pagesFetched = 0;
    let lastVisiblePage = 1;

    const fetchPage = async (page: number) => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const data = await request<{ data: Episode[]; pagination?: Pagination }>(
            `/anime/${id}/episodes?page=${page}`,
          );
          const reported = data.pagination?.last_visible_page;
          if (typeof reported === "number" && reported > lastVisiblePage) lastVisiblePage = reported;
          return data.data ?? [];
        } catch {
          if (attempt < 3) await sleep(900 * (attempt + 1));
        }
      }
      return null;
    };

    for (let page = 1; page <= lastVisiblePage; page++) {
      const batch = await fetchPage(page);
      if (batch === null) {
        // Don't stop the walk — a single flaky page must not hide later ones.
        failedPages.push(page);
        continue;
      }
      pagesFetched++;
      all.push(...batch);
    }

    // Second pass for pages that failed the first time around.
    for (const page of [...failedPages]) {
      const batch = await fetchPage(page);
      if (batch === null) continue;
      failedPages.splice(failedPages.indexOf(page), 1);
      pagesFetched++;
      all.push(...batch);
    }

    const seen = new Set<number>();
    const items = all
      .filter((ep) => (seen.has(ep.mal_id) ? false : (seen.add(ep.mal_id), true)))
      .sort((a, b) => a.mal_id - b.mal_id);

    episodeDiagnostics.set(id, {
      pagesReported: lastVisiblePage,
      pagesFetched,
      failedPages: [...failedPages],
      rawCount: all.length,
      uniqueCount: items.length,
    });
    if (failedPages.length) {
      console.warn(
        `[jikan] episodes ${id}: ${items.length} loaded from ${pagesFetched}/${lastVisiblePage} pages; pages ${failedPages.join(", ")} unavailable`,
      );
    }
    return items;
  },
  async recommendations(id: number) {
    try {
      const data = await request<{ data: { entry: Anime }[] }>(`/anime/${id}/recommendations`);
      return clean((data.data ?? []).map((r) => r.entry)).slice(0, 12);
    } catch {
      return [] as Anime[];
    }
  },
};

const HOUR = 1000 * 60 * 60;

export const trendingQuery = () =>
  queryOptions({ queryKey: ["jikan", "trending"], queryFn: () => jikan.top("airing"), staleTime: HOUR });

export const popularQuery = () =>
  queryOptions({
    queryKey: ["jikan", "popular"],
    queryFn: () => jikan.top("bypopularity"),
    staleTime: HOUR,
  });

export const seasonQuery = () =>
  queryOptions({ queryKey: ["jikan", "season"], queryFn: () => jikan.seasonNow(), staleTime: HOUR });

export const genresQuery = () =>
  queryOptions({ queryKey: ["jikan", "genres"], queryFn: () => jikan.genres(), staleTime: 24 * HOUR });

export const searchQuery = (params: Parameters<typeof jikan.search>[0]) =>
  queryOptions({
    queryKey: ["jikan", "search", params],
    queryFn: () => jikan.search(params),
    staleTime: 10 * 60 * 1000,
  });

export const animeQuery = (id: number) =>
  queryOptions({ queryKey: ["jikan", "anime", id], queryFn: () => jikan.detail(id), staleTime: HOUR });

export const charactersQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "characters", id],
    queryFn: () => jikan.characters(id),
    staleTime: HOUR,
  });

export const episodesQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "episodes", id],
    queryFn: () => jikan.episodes(id),
    staleTime: HOUR,
  });

export const recommendationsQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "recommendations", id],
    queryFn: () => jikan.recommendations(id),
    staleTime: HOUR,
  });

/** Official / legal places to watch — derived from Jikan's licensed links only. */
export function legalSources(anime: Anime) {
  const streaming = (anime.streaming ?? []).map((s) => ({ name: s.name, url: s.url }));
  const official = (anime.external ?? [])
    .filter((e) => /official|crunchyroll|netflix|hidive|prime|hulu|disney/i.test(e.name))
    .map((e) => ({ name: e.name, url: e.url }));
  const all = [...streaming, ...official];
  const seen = new Set<string>();
  return all.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
}
