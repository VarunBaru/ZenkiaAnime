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

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { idMal: malId } }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error("Could not reach the streaming catalogue.");
  const json = (await res.json()) as {
    data?: { Media?: AniListMedia | null };
    errors?: { message: string }[];
  };
  const media = json.data?.Media;
  if (!media?.id) throw new Error("No player is available for this title yet.");

  memo.set(malId, media);
  return media;
}

export const anilistQuery = (malId: number) =>
  queryOptions({
    queryKey: ["anilist", malId],
    queryFn: () => resolveAniList(malId),
    staleTime: 24 * 60 * 60 * 1000,
    enabled: Number.isFinite(malId) && malId > 0,
  });

/** Authorised embed source for this project. */
export function embedUrl(anilistId: number, episode: number) {
  return `https://aniembed.se/e/${anilistId}/${episode}`;
}
