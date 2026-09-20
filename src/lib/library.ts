import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Anime } from "@/lib/jikan";
import { posterOf } from "@/lib/jikan";

export type WatchStatus = "planned" | "watching" | "completed" | "on_hold" | "dropped";

export const STATUS_LABELS: Record<WatchStatus, string> = {
  planned: "Plan to watch",
  watching: "Watching",
  completed: "Completed",
  on_hold: "On hold",
  dropped: "Dropped",
};

export type WatchlistRow = {
  id: string;
  user_id: string;
  mal_id: number;
  title: string;
  image_url: string | null;
  media_type: string | null;
  year: number | null;
  score: number | null;
  status: WatchStatus;
  created_at: string;
  updated_at: string;
};

export type HistoryRow = {
  id: string;
  user_id: string;
  mal_id: number;
  title: string;
  image_url: string | null;
  episodes_watched: number;
  total_episodes: number | null;
  last_watched_at: string;
};

export const watchlistQuery = () =>
  queryOptions({
    queryKey: ["watchlist"],
    queryFn: async (): Promise<WatchlistRow[]> => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as WatchlistRow[];
    },
  });

export const historyQuery = () =>
  queryOptions({
    queryKey: ["history"],
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .order("last_watched_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as HistoryRow[];
    },
  });

export const profileQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; username: string | null; avatar_url: string | null } | null;
    },
  });

export async function addToWatchlist(userId: string, anime: Anime, status: WatchStatus = "planned") {
  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: userId,
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url: posterOf(anime),
      media_type: anime.type ?? null,
      year: anime.year ?? null,
      score: anime.score ?? null,
      status,
    },
    { onConflict: "user_id,mal_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeFromWatchlist(userId: string, malId: number) {
  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("mal_id", malId);
  if (error) throw new Error(error.message);
}

export async function setWatchlistStatus(userId: string, malId: number, status: WatchStatus) {
  const { error } = await supabase
    .from("watchlist")
    .update({ status })
    .eq("user_id", userId)
    .eq("mal_id", malId);
  if (error) throw new Error(error.message);
}

export async function recordProgress(
  userId: string,
  anime: Anime,
  episodesWatched: number,
) {
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_id: userId,
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url: posterOf(anime),
      episodes_watched: Math.max(0, episodesWatched),
      total_episodes: anime.episodes ?? null,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mal_id" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Records that a user opened a specific episode. One row per user + anime is
 * kept (unique on user_id, mal_id) so re-watching updates instead of piling up.
 */
export async function recordEpisodeWatch(
  userId: string,
  anime: Pick<Anime, "mal_id" | "title" | "title_english" | "episodes" | "images">,
  episodeNumber: number,
) {
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_id: userId,
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url: posterOf(anime),
      episode_number: episodeNumber,
      episodes_watched: Math.max(0, episodeNumber),
      total_episodes: anime.episodes ?? null,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mal_id" },
  );
  if (error) throw new Error(error.message);
}

export async function ensureProfile(userId: string, username?: string | null) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: username ?? null }, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteHistoryEntry(userId: string, id: string) {
  const { error } = await supabase
    .from("watch_history")
    .delete()
    .eq("user_id", userId)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function clearHistory(userId: string) {
  const { error } = await supabase.from("watch_history").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export function formatWatchedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
