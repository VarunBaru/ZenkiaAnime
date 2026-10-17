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

type KitsuCharacter = {
  id: string;
  type: string;
  attributes?: {
    name?: string;
    canonicalName?: string;
    image?: { original?: string };
  };
};

type KitsuEpisode = {
  id: string;
  type: string;
  attributes?: {
    number?: number;
    canonicalTitle?: string;
    titles?: { en?: string; ja_jp?: string };
    airdate?: string | null;
  };
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

  const res = await fetch(`${BASE}/anime?${sp}`, {
    headers: { Accept: "application/vnd.api+json" },
  });
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
    const poster =
      a.posterImage?.large || a.posterImage?.medium || a.posterImage?.small || undefined;
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

// In-memory cache for MAL ID -> Kitsu ID mapping
const kitsuIdCache = new Map<number, string>([
  [21, "12"], // One Piece
  [20, "11"], // Naruto
  [1735, "1555"], // Naruto Shippuden
  [31964, "11469"], // My Hero Academia (was 11440 which is "Tatsumi" movie)
  [16498, "7442"], // Attack on Titan
  [1535, "1376"], // Death Note
  [5114, "3936"], // Fullmetal Alchemist: Brotherhood (was 4382 which is "Ookami to Koushinryou II")
  [11061, "6448"], // Hunter x Hunter (2011)
  [269, "244"], // Bleach
  [30276, "10740"], // One Punch Man
  [38000, "41370"], // Demon Slayer
  [40748, "42765"], // Jujutsu Kaisen
  [52991, "46474"], // Frieren
]);

async function getKitsuId(malId: number): Promise<string | null> {
  if (kitsuIdCache.has(malId)) return kitsuIdCache.get(malId)!;

  try {
    const mappingRes = await fetch(
      `${BASE}/mappings?filter[externalSite]=myanimelist/anime&filter[externalId]=${malId}&include=item`,
      {
        headers: { Accept: "application/vnd.api+json" },
        signal: AbortSignal.timeout(8000),
      },
    );

    if (mappingRes.ok) {
      const mappingJson = (await mappingRes.json()) as {
        data?: Array<{ relationships?: { item?: { data?: { id?: string } } } }>;
        included?: Array<{ id: string; type: string }>;
      };
      const foundItem = mappingJson.included?.find((i) => i.type === "anime");
      const id = foundItem?.id || mappingJson.data?.[0]?.relationships?.item?.data?.id;
      if (id) {
        kitsuIdCache.set(malId, id);
        return id;
      }
    }
  } catch (err) {
    console.warn(`[kitsu] mapping lookup error for MAL ${malId}:`, err);
  }
  return null;
}

/**
 * Fetch detailed anime info from Kitsu using a MyAnimeList ID.
 * Queries Kitsu's mappings to find the corresponding Kitsu entry.
 */
export async function kitsuDetailByMalId(malId: number): Promise<Anime | null> {
  try {
    const kitsuId = await getKitsuId(malId);
    if (!kitsuId) {
      console.warn(`[kitsu] no anime found for MAL ID ${malId}`);
      return null;
    }

    // Fetch full details with categories and productions included
    const detailRes = await fetch(
      `${BASE}/anime/${kitsuId}?include=categories,animeProductions.producer`,
      {
        headers: { Accept: "application/vnd.api+json" },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!detailRes.ok) return null;

    const detailJson = (await detailRes.json()) as {
      data?: {
        id: string;
        attributes?: {
          canonicalTitle?: string;
          titles?: { en?: string; en_jp?: string; ja_jp?: string };
          synopsis?: string | null;
          averageRating?: string | null;
          startDate?: string | null;
          endDate?: string | null;
          subtype?: string | null;
          episodeCount?: number | null;
          status?: string | null;
          posterImage?: {
            small?: string;
            medium?: string;
            large?: string;
            original?: string;
          } | null;
          ageRating?: string | null;
          ageRatingGuide?: string | null;
        };
      };
      included?: Array<{
        id: string;
        type: string;
        attributes?: { title?: string; name?: string; slug?: string };
      }>;
    };

    const a = detailJson.data?.attributes;
    const poster =
      a?.posterImage?.large || a?.posterImage?.medium || a?.posterImage?.small || undefined;

    // Extract categories (genres)
    const categories = (detailJson.included ?? []).filter((inc) => inc.type === "categories");
    const genres = categories.map((cat, idx) => ({
      mal_id: idx + 1,
      name: cat.attributes?.title || cat.attributes?.name || "Unknown",
    }));

    // Extract producers (studios)
    const producers = (detailJson.included ?? []).filter((inc) => inc.type === "producers");
    const studios = producers.slice(0, 3).map((prod, idx) => ({
      mal_id: idx + 1,
      name: prod.attributes?.name || "Unknown Studio",
    }));

    const rating = a?.ageRating
      ? `${a.ageRating}${a.ageRatingGuide ? ` - ${a.ageRatingGuide}` : ""}`
      : null;

    // Add streaming links fallback (search on popular official platforms)
    const titleForUrl = encodeURIComponent(a?.canonicalTitle || a?.titles?.en || "anime");
    const streaming = [
      { name: "Crunchyroll", url: `https://www.crunchyroll.com/search?q=${titleForUrl}` },
      { name: "Netflix", url: `https://www.netflix.com/search?q=${titleForUrl}` },
      { name: "Hulu", url: `https://www.hulu.com/search?q=${titleForUrl}` },
    ];

    const airedData = a?.startDate
      ? {
          from: a.startDate,
          to: a.endDate ?? null,
          string: `${a.startDate} to ${a.endDate ?? "?"}`,
        }
      : undefined;

    return {
      mal_id: malId,
      title: a?.titles?.en_jp || a?.canonicalTitle || "Unknown",
      title_english: a?.titles?.en ?? null,
      title_japanese: a?.titles?.ja_jp ?? null,
      synopsis: a?.synopsis ?? null,
      ...(poster ? { images: { jpg: { image_url: poster, large_image_url: poster } } } : {}),
      score: a?.averageRating ? Math.round((Number(a.averageRating) / 10) * 10) / 10 : null,
      year: a?.startDate ? Number(a.startDate.slice(0, 4)) : null,
      type: a?.subtype ? a.subtype.toUpperCase() : null,
      episodes: a?.episodeCount ?? null,
      status: a?.status ?? null,
      rating: rating,
      genres: genres,
      studios: studios,
      streaming: streaming,
      ...(airedData ? { aired: airedData } : {}),
    };
  } catch (error) {
    console.error(`[kitsu] detail lookup failed for MAL ID ${malId}:`, error);
    return null;
  }
}

/**
 * Fetch characters from Kitsu for a given MAL ID
 */
export async function kitsuCharactersByMalId(malId: number) {
  try {
    const kitsuId = await getKitsuId(malId);
    if (!kitsuId) return [];

    console.log(`[kitsu] fetching characters for Kitsu ID ${kitsuId} (MAL ${malId})`);

    // Fetch characters with character details included
    const charRes = await fetch(
      `${BASE}/anime-characters?filter[animeId]=${kitsuId}&include=character&page[limit]=20`,
      {
        headers: { Accept: "application/vnd.api+json" },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!charRes.ok) {
      console.warn(`[kitsu] characters API returned ${charRes.status}`);
      return [];
    }

    const charJson = (await charRes.json()) as {
      data?: Array<{
        attributes?: { role?: string };
        relationships?: { character?: { data?: { id?: string } } };
      }>;
      included?: Array<{
        id: string;
        type: string;
        attributes?: {
          name?: string;
          canonicalName?: string;
          names?: { en?: string };
          image?: { original?: string; medium?: string };
        };
      }>;
    };

    const characters = (charJson.included ?? [])
      .filter((c) => c.type === "characters")
      .slice(0, 18)
      .map((c, idx) => {
        const name =
          c.attributes?.canonicalName ||
          c.attributes?.name ||
          c.attributes?.names?.en ||
          "Character";
        const img = c.attributes?.image?.original || c.attributes?.image?.medium;
        return {
          character: {
            mal_id: idx + 1,
            name,
            images: img ? { jpg: { image_url: img } } : undefined,
          },
          role: "Main",
        };
      });

    console.log(`[kitsu] found ${characters.length} characters for MAL ID ${malId}`);
    return characters;
  } catch (error) {
    console.error(`[kitsu] characters lookup failed for MAL ID ${malId}:`, error);
    return [];
  }
}

/**
 * Fetch episodes with real titles from Kitsu for a given MAL ID
 */
export async function kitsuEpisodesByMalId(malId: number, fromEpisode = 1) {
  try {
    const kitsuId = await getKitsuId(malId);
    if (!kitsuId) return [];

    console.log(`[kitsu] fetching episodes for Kitsu ID ${kitsuId} (MAL ${malId})`);

    const allEpisodes: Array<{
      mal_id: number;
      title: string;
      title_japanese: string | null;
      aired: string | null;
      filler: boolean;
      recap: boolean;
    }> = [];

    // Fetch batches of episodes using Kitsu's filter[mediaId] endpoint.
    // First get the total count, then fetch in batches of 20.
    const firstRes = await fetch(
      `${BASE}/episodes?filter[mediaId]=${kitsuId}&filter[mediaType]=Anime&page[limit]=1&sort=number`,
      { headers: { Accept: "application/vnd.api+json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!firstRes.ok) return [];

    const firstJson = (await firstRes.json()) as {
      data?: Array<{ attributes?: { number?: number } }>;
      meta?: { count?: number };
    };
    const totalCount = firstJson.meta?.count ?? 0;
    if (totalCount <= 0) return [];

    // Fetch in batches of 20 (Kitsu's max page limit)
    const BATCH = 20;
    const startOffset = Math.floor((Math.max(1, fromEpisode) - 1) / BATCH) * BATCH;
    for (let offset = startOffset; offset < totalCount; offset += BATCH) {
      try {
        const url = `${BASE}/episodes?filter[mediaId]=${kitsuId}&filter[mediaType]=Anime&page[limit]=${BATCH}&page[offset]=${offset}&sort=number`;
        console.log(`[kitsu] fetching episodes batch at ${offset}/${totalCount}: ${url}`);

        const epRes = await fetch(url, {
          headers: { Accept: "application/vnd.api+json" },
          signal: AbortSignal.timeout(8000),
        });

        if (!epRes.ok) break;

        const epJson = (await epRes.json()) as {
          data?: Array<{
            id: string;
            type: string;
            attributes?: {
              number?: number;
              canonicalTitle?: string;
              titles?: { en_us?: string; en_jp?: string; ja_jp?: string; en?: string };
              airdate?: string | null;
              synopsis?: string | null;
            };
          }>;
        };

        const batch = epJson.data ?? [];
        if (batch.length === 0) break;

        for (const ep of batch) {
          const num = ep.attributes?.number;
          if (typeof num !== "number") continue;

          const titles = ep.attributes?.titles ?? {};
          const rawTitle =
            titles.en_us || titles.en || titles.en_jp || ep.attributes?.canonicalTitle || "";

          const title = rawTitle.trim().length > 0 ? rawTitle.trim() : `Episode ${num}`;

          allEpisodes.push({
            mal_id: num,
            title,
            title_japanese: titles.ja_jp ?? null,
            aired: ep.attributes?.airdate ?? null,
            filler: false,
            recap: false,
          });
        }
      } catch (err) {
        console.warn(`[kitsu] error fetching episode page offset ${offset}:`, err);
        break;
      }
    }

    // Sort by episode number
    allEpisodes.sort((a, b) => a.mal_id - b.mal_id);
    console.log(`[kitsu] successfully loaded ${allEpisodes.length} real episodes for MAL ${malId}`);
    return allEpisodes;
  } catch (error) {
    console.error(`[kitsu] episodes lookup failed for MAL ID ${malId}:`, error);
    return [];
  }
}
