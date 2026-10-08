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
  relations?: { relation: string; entry: { mal_id: number; type: string; name: string }[] }[];
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
  upstreamMessage?: string;
  upstreamStatus?: number;
  degraded?: boolean;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Keep client-side request starts under Jikan's published 3 requests/second. */
const MIN_REQUEST_GAP_MS = 400;
let nextRequestAt = 0;

async function enqueueRequest<T>(job: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const startAt = Math.max(now, nextRequestAt);
  nextRequestAt = startAt + MIN_REQUEST_GAP_MS;
  const wait = startAt - now;
  if (wait > 0) await sleep(wait);
  return job();
}

function logJikanFailure(path: string, status: number, responseMessage: string) {
  if (import.meta.env.DEV) {
    console.warn("[jikan] request failed", {
      endpoint: `${BASE}${path}`,
      status,
      responseMessage,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * All upstream retries and rate limiting happen in the shared proxy. Keeping
 * this client request single-attempt avoids multiplying retries in each layer.
 */
async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await enqueueRequest(() =>
      fetch(`${BASE}${path}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      }),
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    logJikanFailure(path, 0, error instanceof Error ? error.message : String(error));
    throw new JikanError("Could not reach the anime database. Check your connection.", 0);
  }

  const responseText = await res.text();
  let payload: (T & JikanPayloadError) | undefined;
  try {
    payload = JSON.parse(responseText) as T & JikanPayloadError;
  } catch {
    payload = undefined;
  }

  const status = payload?.upstreamStatus ?? res.status;
  const responseMessage = payload?.upstreamMessage ?? payload?.error ?? responseText.slice(0, 300);
  if (!res.ok) {
    logJikanFailure(path, status, responseMessage || res.statusText || "Empty response");
    if (res.status === 404) throw new JikanError("We couldn't find that anime.", 404);
    throw new JikanError("The anime database is having trouble right now.", status);
  }

  if (!payload) {
    logJikanFailure(path, res.status, "The response was not valid JSON.");
    throw new JikanError("The anime database is having trouble right now.", res.status);
  }
  if (payload.degraded || payload.error) {
    logJikanFailure(path, status, responseMessage || "The service returned an error.");
    throw new JikanError(
      "The anime database is having trouble right now.",
      status,
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
      } catch (fallbackError) {
        if (import.meta.env.DEV) {
          console.warn("[jikan] search fallback failed", {
            endpoint: `${BASE}/anime`,
            timestamp: new Date().toISOString(),
            primaryError: err instanceof Error ? err.message : String(err),
            fallbackError:
              fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
          });
        }
        const status = err instanceof JikanError ? err.status : 503;
        throw new JikanError("The anime database is having trouble right now.", status);
      }
    }
  },
  async genres() {
    const data = await request<{ data: Genre[] }>(`/genres/anime`);
    const seen = new Set<number>();
    return (data.data ?? []).filter(
      (g) =>
        !["Hentai", "Erotica"].includes(g.name) &&
        (seen.has(g.mal_id) ? false : (seen.add(g.mal_id), true)),
    );
  },
  async detail(id: number) {
    const data = await request<{ data: Anime }>(`/anime/${id}/full`);
    return data.data;
  },
  // Secondary sections: never fail the page when upstream is flaky.
  async characters(id: number) {
    // Errors propagate so the page can offer Retry instead of caching an empty list.
    const data = await request<{ data: Character[] }>(`/anime/${id}/characters`);
    const seen = new Set<number>();
    return (data.data ?? []).filter((c) =>
      seen.has(c.character.mal_id) ? false : (seen.add(c.character.mal_id), true),
    );
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
    const data = await request<{ data: { entry: Anime }[] }>(`/anime/${id}/recommendations`);
    return clean((data.data ?? []).map((r) => r.entry))
      .filter((a) => a.mal_id !== id)
      .slice(0, 12);
  },
};

const HALF_HOUR = 30 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const trendingQuery = () =>
  queryOptions({
    queryKey: ["jikan", "trending"],
    queryFn: () => jikan.top("airing"),
    staleTime: HALF_HOUR,
    retry: false,
  });

export const popularQuery = () =>
  queryOptions({
    queryKey: ["jikan", "popular"],
    queryFn: () => jikan.top("bypopularity"),
    staleTime: HALF_HOUR,
    retry: false,
  });

export const seasonQuery = () =>
  queryOptions({
    queryKey: ["jikan", "season"],
    queryFn: () => jikan.seasonNow(),
    staleTime: HALF_HOUR,
    retry: false,
  });

export const genresQuery = () =>
  queryOptions({
    queryKey: ["jikan", "genres"],
    queryFn: () => jikan.genres(),
    staleTime: DAY,
    retry: false,
  });

export const searchQuery = (params: Parameters<typeof jikan.search>[0]) =>
  queryOptions({
    queryKey: ["jikan", "search", params],
    queryFn: () => jikan.search(params),
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

export const animeQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "anime", id],
    queryFn: () => jikan.detail(id),
    staleTime: DAY,
    retry: false,
  });

export const charactersQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "characters", id],
    queryFn: () => jikan.characters(id),
    staleTime: HALF_HOUR,
    retry: false,
  });

export const episodesQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "episodes", id],
    queryFn: () => jikan.episodes(id),
    staleTime: HALF_HOUR,
    retry: false,
  });

export const recommendationsQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "recommendations", id],
    queryFn: () => jikan.recommendations(id),
    staleTime: HALF_HOUR,
    retry: false,
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
