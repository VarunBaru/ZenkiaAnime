import { queryOptions } from "@tanstack/react-query";

/**
 * AniList GraphQL helper — resolves an AniList media ID from the MyAnimeList /
 * Jikan ID the rest of the app already uses. Metadata only.
 */

const ENDPOINT = "https://graphql.anilist.co";

const QUERY = `query ($idMal: Int) {
  Media(idMal: $idMal, type: ANIME) { id episodes }
}`;

export type AniListMedia = { id: number; episodes: number | null };

/** In-memory memo so the same MAL id is never resolved twice per session. */
const memo = new Map<number, AniListMedia>();

export async function resolveAniList(malId: number): Promise<AniListMedia> {
  const cached = memo.get(malId);
  if (cached) return cached;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { idMal: malId } }),
      signal: AbortSignal.timeout(6000),
    });

    if (res.ok) {
      const json = (await res.json()) as {
        data?: { Media?: AniListMedia | null };
      };
      const media = json.data?.Media;
      if (media?.id) {
        memo.set(malId, media);
        return media;
      }
    }
  } catch (err) {
    console.warn(`[anilist] resolution failed for MAL ${malId}, using MAL ID fallback:`, err);
  }

  // Graceful fallback: use MAL ID directly so the player always loads
  const fallbackMedia: AniListMedia = { id: malId, episodes: null };
  memo.set(malId, fallbackMedia);
  return fallbackMedia;
}

export const anilistQuery = (malId: number) =>
  queryOptions({
    queryKey: ["anilist", malId],
    queryFn: () => resolveAniList(malId),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: Number.isFinite(malId) && malId > 0,
  });

/** Authorised embed source for this project. */
/** AniEmbed documents `?lang=sub|dub` and `?s=server` on its embed endpoint. */
export function embedUrl(anilistId: number, episode: number, lang?: "sub" | "dub", server?: string) {
  const base = `https://aniembed.se/e/${anilistId}/${episode}`;
  const params = new URLSearchParams();
  if (lang) params.set("lang", lang);
  if (server) params.set("s", server);
  params.set("autoplay", "true");
  return `${base}?${params.toString()}`;
}
