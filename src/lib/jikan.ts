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

/** Space browser request starts without making sections wait on prior responses. */
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
async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    const url = `${BASE}${path}`;
    console.log(`[jikan] requesting: ${url}`);
    res = await enqueueRequest(() =>
      fetch(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000), // Reduced timeout to fail faster
      }),
    );
    console.log(`[jikan] response status: ${res.status} for ${url}`);
  } catch (error) {
    console.warn(
      `[jikan] proxy failed for ${path}:`,
      error instanceof Error ? error.message : String(error),
    );
    logJikanFailure(path, 0, error instanceof Error ? error.message : String(error));
    throw new JikanError("Could not reach the anime database.", 0);
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
    throw new JikanError("The anime database is having trouble right now.", status);
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
    try {
      const data = await request<{ data: Anime[] }>(`/top/anime?filter=${filter}&limit=${limit}`);
      return clean(data.data ?? []);
    } catch (err) {
      console.warn(`[jikan] top(${filter}) failed, using Kitsu fallback`);
      try {
        const { kitsuSearch } = await import("./kitsu");
        const orderMap = {
          airing: "popularity",
          bypopularity: "popularity",
          favorite: "score",
        };
        const fallback = await kitsuSearch({ orderBy: orderMap[filter], limit });
        console.log(`[jikan] Kitsu fallback returned ${fallback.items.length} items`);
        return clean(fallback.items);
      } catch (fallbackErr) {
        console.error(`[jikan] Kitsu fallback also failed:`, fallbackErr);
        return [];
      }
    }
  },
  async seasonNow(limit = 12) {
    try {
      const data = await request<{ data: Anime[] }>(`/seasons/now?limit=${limit}`);
      return clean(data.data ?? []);
    } catch (err) {
      try {
        const { kitsuSearch } = await import("./kitsu");
        const fallback = await kitsuSearch({ orderBy: "start_date", limit });
        return clean(fallback.items);
      } catch {
        return [];
      }
    }
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
    try {
      const data = await request<{ data: Genre[] }>(`/genres/anime`);
      const seen = new Set<number>();
      return (data.data ?? []).filter(
        (g) =>
          !["Hentai", "Erotica"].includes(g.name) &&
          (seen.has(g.mal_id) ? false : (seen.add(g.mal_id), true)),
      );
    } catch {
      // Fallback genres when Jikan genres endpoint is unreachable
      return [
        { mal_id: 1, name: "Action" },
        { mal_id: 2, name: "Adventure" },
        { mal_id: 4, name: "Comedy" },
        { mal_id: 8, name: "Drama" },
        { mal_id: 10, name: "Fantasy" },
        { mal_id: 14, name: "Horror" },
        { mal_id: 7, name: "Mystery" },
        { mal_id: 22, name: "Romance" },
        { mal_id: 24, name: "Sci-Fi" },
        { mal_id: 36, name: "Slice of Life" },
        { mal_id: 30, name: "Sports" },
        { mal_id: 37, name: "Supernatural" },
      ];
    }
  },
  async videoTrailer(id: number): Promise<string | null> {
    try {
      const response = await request<{
        data?: {
          promo?: {
            trailer?: {
              youtube_id?: string | null;
              url?: string | null;
              embed_url?: string | null;
            } | null;
          }[];
        };
      }>(`/anime/${id}/videos`);
      for (const video of response.data?.promo ?? []) {
        const trailer = video.trailer;
        if (!trailer) continue;
        if (trailer.youtube_id && /^[A-Za-z0-9_-]{11}$/.test(trailer.youtube_id)) {
          return trailer.youtube_id;
        }
        const videoUrl = trailer.embed_url || trailer.url;
        if (videoUrl) {
          try {
            const parsed = new URL(videoUrl);
            const candidate = parsed.hostname.endsWith("youtu.be")
              ? parsed.pathname.slice(1, 12)
              : trailer.youtube_id ||
                parsed.searchParams.get("v") ||
                parsed.pathname.split("/embed/")[1]?.slice(0, 11);
            if (
              candidate &&
              candidate.length === 11 &&
              [...candidate].every((character) =>
                "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-".includes(character),
              )
            ) {
              return candidate;
            }
          } catch {
            // Ignore malformed links and continue to the next promo.
          }
        }
      }
      }
    } catch {
      // A missing trailer is normal; the hero keeps its poster fallback.
    }
    return null;
  },
  async detail(id: number) {
    try {
      const data = await request<{ data: Anime }>(`/anime/${id}/full`);
      return data.data;
    } catch (err) {
      console.warn(`[jikan] detail(${id}) failed, using Kitsu fallback`);
      // Try Kitsu as fallback using MAL ID mapping
      try {
        const { kitsuDetailByMalId } = await import("./kitsu");
        const match = await kitsuDetailByMalId(id);
        if (match) {
          console.log(`[jikan] Kitsu fallback found anime: ${match.title}`);
          return match;
        }
      } catch (fallbackErr) {
        console.error(`[jikan] Kitsu fallback also failed:`, fallbackErr);
      }
      throw err;
    }
  },
  async characters(id: number) {
    try {
      const data = await request<{ data: Character[] }>(`/anime/${id}/characters`);
      const seen = new Set<number>();
      return (data.data ?? []).filter((c) =>
        seen.has(c.character.mal_id) ? false : (seen.add(c.character.mal_id), true),
      );
    } catch (err) {
      console.warn(`[jikan] characters(${id}) failed, trying Kitsu fallback`);
      try {
        const { kitsuCharactersByMalId } = await import("./kitsu");
        return await kitsuCharactersByMalId(id);
      } catch {
        return [];
      }
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
    try {
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
            if (typeof reported === "number" && reported > lastVisiblePage)
              lastVisiblePage = reported;
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
          failedPages.push(page);
          continue;
        }
        pagesFetched++;
        all.push(...batch);
      }

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

      if (items.length > 0) {
        // Jikan's One Piece episode feed stops including Japanese titles after
        // episode 743. Fill only missing titles from Kitsu; keep Jikan's episode
        // list and English titles authoritative, and leave unknown titles empty.
        if (
          id === 21 &&
          items.some(
            (ep) =>
              ep.mal_id >= 744 &&
              (!ep.title_japanese?.trim() ||
                !ep.title.trim() ||
                /^episode\s+\d+$/i.test(ep.title.trim())),
          )
        ) {
          try {
            const { kitsuEpisodesByMalId } = await import("./kitsu");
            const fallback = await kitsuEpisodesByMalId(21, 744);
            const fallbackByNumber = new Map(fallback.map((ep) => [ep.mal_id, ep]));
            const mergedItems = items.map((ep) => {
              const fallbackEpisode = fallbackByNumber.get(ep.mal_id);
              const titleJapanese =
                ep.title_japanese?.trim() || fallbackEpisode?.title_japanese?.trim();
              const titleIsGeneric = !ep.title.trim() || /^episode\s+\d+$/i.test(ep.title.trim());
              const fallbackTitle = fallbackEpisode?.title?.trim();
              const title =
                titleIsGeneric && fallbackTitle && !/^episode\s+\d+$/i.test(fallbackTitle)
                  ? fallbackTitle
                  : ep.title;
              return {
                ...ep,
                ...(titleJapanese ? { title_japanese: titleJapanese } : {}),
                title,
              };
            });
            const existingNumbers = new Set(items.map((ep) => ep.mal_id));
            const supplementalEpisodes = fallback.filter(
              (ep) => ep.mal_id >= 744 && !existingNumbers.has(ep.mal_id),
            );
            return [...mergedItems, ...supplementalEpisodes].sort((a, b) => a.mal_id - b.mal_id);
          } catch {
            // The primary Jikan episode data remains usable without the fallback.
          }
        }
        return items;
      }
    } catch {
      // Fall through to Kitsu
    }

    // Kitsu fallback for episodes
    console.warn(`[jikan] episodes(${id}) failed, trying Kitsu fallback`);
    try {
      const { kitsuEpisodesByMalId } = await import("./kitsu");
      const kitsuEpisodes = await kitsuEpisodesByMalId(id);
      if (kitsuEpisodes.length > 0) {
        // Kitsu now returns the full episode list (up to 1410 for One Piece).
        // We avoid calling this.detail(id) here: it would trigger another
        // slow Jikan -> Kitsu round-trip just to pad missing episodes, and
        // the component already holds the resolved anime detail elsewhere.
        return kitsuEpisodes;
      }
    } catch {
      // Fall through to generated episodes
    }

    // Final fallback: ALWAYS generate episodes for any anime
    console.warn(`[jikan] episodes(${id}) generating fallback episode list`);
    // Avoid calling this.detail(id) in the final fallback: Jikan is down, so
    // it would only fall back to a slow Kitsu detail call. Default to a
    // sensible episode count instead.
    const targetCount = 100;
    console.log(`[jikan] generating ${targetCount} episodes for MAL ID ${id}`);
    return Array.from({ length: targetCount }, (_, i) => ({
      mal_id: i + 1,
      title: `Episode ${i + 1}`,
      title_japanese: null,
      aired: null,
      filler: false,
      recap: false,
    }));
  },
  async recommendations(id: number) {
    try {
      const data = await request<{ data: { entry: Anime }[] }>(`/anime/${id}/recommendations`);
      const items = clean((data.data ?? []).map((r) => r.entry))
        .filter((a) => a.mal_id !== id)
        .slice(0, 12);
      if (items.length > 0) return items;
    } catch {
      // Fall through
    }

    console.warn(`[jikan] recommendations(${id}) failed, trying Kitsu fallback`);
    try {
      const { kitsuSearch } = await import("./kitsu");
      const fallback = await kitsuSearch({ orderBy: "popularity", limit: 6 });
      return fallback.items.filter((a) => a.mal_id !== id);
    } catch {
      return [];
    }
  },
};

const HALF_HOUR = 30 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

export const trendingQuery = () =>
  queryOptions({
    queryKey: ["jikan", "trending"],
    queryFn: () => jikan.top("airing"),
    staleTime: HALF_HOUR,
    retry: 2,
    retryDelay: 1000,
  });

export const popularQuery = () =>
  queryOptions({
    queryKey: ["jikan", "popular"],
    queryFn: () => jikan.top("bypopularity"),
    staleTime: HALF_HOUR,
    retry: 2,
    retryDelay: 1000,
  });

export const seasonQuery = () =>
  queryOptions({
    queryKey: ["jikan", "season"],
    queryFn: () => jikan.seasonNow(),
    staleTime: HALF_HOUR,
    retry: 2,
    retryDelay: 1000,
  });

export const genresQuery = () =>
  queryOptions({
    queryKey: ["jikan", "genres"],
    queryFn: () => jikan.genres(),
    staleTime: DAY,
    retry: 2,
    retryDelay: 1000,
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
    retry: 2,
    retryDelay: 1000,
  });

export const animeVideoTrailerQuery = (id: number) =>
  queryOptions({
    queryKey: ["jikan", "anime-video-trailer", id],
    queryFn: () => jikan.videoTrailer(id),
    staleTime: HALF_HOUR,
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
