import type { Anime, Pagination } from "./jikan";

/**
 * Kitsu fallback catalogue.
 *
 * MyAnimeList's search endpoint is frequently unavailable. When it fails we
 * query Kitsu's public metadata API instead and map results onto the same
 * `Anime` shape, so the rest of the app never knows the difference. Only
 * titles that carry a MyAnimeList mapping are kept, because every detail page
 * and watchlist row is keyed by MAL id. Metadata only — no video.
 */

const BASE = "https://kitsu.app/api/edge";

type KitsuAnime = {
  id: string;
  attributes: {
    canonicalTitle: string;
    titles?: { en?: string; en_jp?: string; ja_jp?: string };
    synopsis?: string | null;
    averageRating?: string | null;
    startDate?: string | null;
    subtype?: string | null;
    episodeCount?: number | null;
    status?: string | null;
    posterImage?: { small?: string; medium?: string; large?: string; original?: string } | null;
  };
  relationships?: { mappings?: { data?: { id: string }[] } };
};

type KitsuMapping = {
  id: string;
  attributes: { externalSite: string; externalId: string };
};

const TYPE_MAP: Record<string, string> = {
  tv: "TV",
  movie: "movie",
  ova: "OVA",
  ona: "ONA",
  special: "special",
};

const SORT_MAP: Record<string, string> = {
  popularity: "-userCount",
  score: "-averageRating",
  title: "canonicalTitle",
  start_date: "-startDate",
};

export async function kitsuSearch(params: {
  q?: string;
  genreName?: string;
  type?: string;
  orderBy?: string;
  page?: number;
  limit?: number;
}): Promise<{ items: Anime[]; pagination: Pagination }> {
  const limit = Math.min(params.limit ?? 20, 20);
  const page = params.page ?? 1;
  const sp = new URLSearchParams({
    "page[limit]": String(limit),
    "page[offset]": String((page - 1) * limit),
    include: "mappings",
  });
  if (params.q) sp.set("filter[text]", params.q);
  if (params.genreName) sp.set("filter[categories]", params.genreName.toLowerCase());
  if (params.type && TYPE_MAP[params.type.toLowerCase()]) {
    sp.set("filter[subtype]", TYPE_MAP[params.type.toLowerCase()]!);
  }
  if (!params.q) sp.set("sort", SORT_MAP[params.orderBy ?? "popularity"] ?? "-userCount");

  const res = await fetch(`${BASE}/anime?${sp}`, { headers: { Accept: "application/vnd.api+json" } });
  if (!res.ok) throw new Error("Kitsu request failed");
  const json = (await res.json()) as {
    data: KitsuAnime[];
    included?: KitsuMapping[];
    meta?: { count?: number };
  };

  const malByMappingId = new Map<string, number>();
  for (const inc of json.included ?? []) {
    if (inc.attributes?.externalSite === "myanimelist/anime") {
      const id = Number(inc.attributes.externalId);
      if (Number.isFinite(id)) malByMappingId.set(inc.id, id);
    }
  }

  const items: Anime[] = [];
  for (const entry of json.data ?? []) {
    const malId = (entry.relationships?.mappings?.data ?? [])
      .map((m) => malByMappingId.get(m.id))
      .find((v): v is number => typeof v === "number");
    if (!malId) continue;
    const a = entry.attributes;
    const poster = a.posterImage?.large || a.posterImage?.medium || a.posterImage?.small || undefined;
    items.push({
      mal_id: malId,
      title: a.titles?.en_jp || a.canonicalTitle,
      title_english: a.titles?.en ?? null,
      title_japanese: a.titles?.ja_jp ?? null,
      synopsis: a.synopsis ?? null,
      ...(poster ? { images: { jpg: { image_url: poster, large_image_url: poster } } } : {}),
      score: a.averageRating ? Math.round((Number(a.averageRating) / 10) * 10) / 10 : null,
      year: a.startDate ? Number(a.startDate.slice(0, 4)) : null,
      type: a.subtype ? a.subtype.toUpperCase() : null,
      episodes: a.episodeCount ?? null,
      status: a.status ?? null,
    });
  }

  const total = json.meta?.count ?? items.length;
  const lastPage = Math.max(1, Math.ceil(total / limit));
  return {
    items,
    pagination: {
      current_page: page,
      last_visible_page: lastPage,
      has_next_page: page < lastPage,
    },
  };
}
