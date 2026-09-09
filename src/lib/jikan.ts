import { queryOptions } from "@tanstack/react-query";

/**
 * Jikan API service layer (unofficial MyAnimeList metadata API).
 * Metadata only — AnimeHub never hosts, mirrors or streams episodes.
 */

const BASE = "https://api.jikan.moe/v4";

export type AnimeImage = {
  jpg?: { image_url?: string; large_image_url?: string };
  webp?: { image_url?: string; large_image_url?: string };
};

export type Anime = {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Jikan rate-limits at ~3 requests/second. All calls go through one queue that
 * spaces requests out, so parallel page sections never trip the limiter.
 */
const MIN_GAP_MS = 400;
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
    res = await enqueue(() => fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } }));
  } catch {
    if (attempt < 2) {
      await sleep(600 * (attempt + 1));
      return request<T>(path, attempt + 1);
    }
    throw new JikanError("Could not reach the anime database. Check your connection.", 0);
  }

  if (res.status === 429 && attempt < 4) {
    await sleep(1200 * (attempt + 1));
    return request<T>(path, attempt + 1);
  }
  if (res.status === 404) throw new JikanError("We couldn't find that anime.", 404);
  if (!res.ok) {
    if (attempt < 2 && res.status >= 500) {
      await sleep(700 * (attempt + 1));
      return request<T>(path, attempt + 1);
    }
    throw new JikanError("The anime database is having trouble right now.", res.status);
  }
  return (await res.json()) as T;
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

/** Remove duplicate mal_ids (Jikan pages can repeat entries). */
function dedupe(list: Anime[]) {
  const seen = new Set<number>();
  return list.filter((a) => (seen.has(a.mal_id) ? false : (seen.add(a.mal_id), true)));
}

export const jikan = {
  async top(filter: "airing" | "bypopularity" | "favorite", limit = 14) {
    const data = await request<{ data: Anime[] }>(
      `/top/anime?filter=${filter}&limit=${limit}&sfw=true`,
    );
    return dedupe(data.data ?? []);
  },
  async seasonNow(limit = 14) {
    const data = await request<{ data: Anime[] }>(`/seasons/now?limit=${limit}&sfw=true`);
    return dedupe(data.data ?? []);
  },
  async search(params: {
    q?: string;
    genre?: string;
    type?: string;
    orderBy?: string;
    page?: number;
    limit?: number;
  }) {
    const sp = new URLSearchParams({ sfw: "true", limit: String(params.limit ?? 24) });
    if (params.q) sp.set("q", params.q);
    if (params.genre) sp.set("genres", params.genre);
    if (params.type) sp.set("type", params.type);
    if (params.orderBy) {
      sp.set("order_by", params.orderBy);
      sp.set("sort", params.orderBy === "title" ? "asc" : "desc");
    }
    if (params.page) sp.set("page", String(params.page));
    const data = await request<{ data: Anime[]; pagination: Pagination }>(`/anime?${sp}`);
    return { items: dedupe(data.data ?? []), pagination: data.pagination };
  },
  async genres() {
    const data = await request<{ data: Genre[] }>(`/genres/anime?filter=genres`);
    return data.data ?? [];
  },
  async detail(id: number) {
    const data = await request<{ data: Anime }>(`/anime/${id}/full`);
    return data.data;
  },
  async characters(id: number) {
    const data = await request<{ data: Character[] }>(`/anime/${id}/characters`);
    return (data.data ?? []).slice(0, 18);
  },
  async episodes(id: number) {
    const data = await request<{ data: Episode[] }>(`/anime/${id}/episodes`);
    return data.data ?? [];
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
