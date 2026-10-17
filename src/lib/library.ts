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
  episode_number: number | null;
  total_episodes: number | null;
  progress_seconds: number | null;
  duration_seconds: number | null;
  progress_percent: number | null;
  completed: boolean;
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

export const historyQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["history", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<HistoryRow[]> => {
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .eq("user_id", userId!)
        .order("last_watched_at", { ascending: false })
        .abortSignal(AbortSignal.timeout(10_000));
      if (error) throw new Error(error.message);
      return (data ?? []) as HistoryRow[];
    },
    retry: false,
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

export async function addToWatchlist(
  userId: string,
  anime: Anime,
  status: WatchStatus = "planned",
) {
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

export async function recordProgress(userId: string, anime: Anime, episodesWatched: number) {
  const episode = Math.max(1, episodesWatched);
  const { error } = await supabase.from("watch_history").upsert(
    {
      user_id: userId,
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url: posterOf(anime),
      episode_number: episode,
      episodes_watched: episode,
      total_episodes: anime.episodes ?? null,
      completed: true,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mal_id,episode_number" },
  );
  if (error) throw new Error(error.message);
}

/**
 * Writes are serialised so an "episode left" progress flush always lands
 * before the next episode's "opened" record.
 */
let writeChain: Promise<unknown> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.then(fn, fn);
  writeChain = next.catch(() => undefined);
  return next;
}

type AnimeRef = Pick<Anime, "mal_id" | "title" | "title_english" | "episodes" | "images">;

/**
 * Records that a user opened a specific episode. One row per
 * user + anime + episode; reopening only bumps last_watched_at and keeps any
 * saved timeline position.
 */
export function recordEpisodeWatch(userId: string, anime: AnimeRef, episodeNumber: number) {
  return enqueue(async () => {
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
      { onConflict: "user_id,mal_id,episode_number" },
    );
    if (error) throw new Error(error.message);
  });
}

export type PlaybackProgress = { currentTime: number; duration: number; completed: boolean };

/** Saves a timeline snapshot reported by the player's official event API. */
export function saveEpisodeProgress(
  userId: string,
  anime: AnimeRef,
  episodeNumber: number,
  p: PlaybackProgress,
) {
  return enqueue(async () => {
    const percent = p.duration > 0 ? Math.min(100, (p.currentTime / p.duration) * 100) : null;
    const { error } = await supabase.from("watch_history").upsert(
      {
        user_id: userId,
        mal_id: anime.mal_id,
        title: anime.title_english || anime.title,
        image_url: posterOf(anime),
        episode_number: episodeNumber,
        episodes_watched: Math.max(0, episodeNumber),
        total_episodes: anime.episodes ?? null,
        progress_seconds: Math.round(p.currentTime * 10) / 10,
        duration_seconds: p.duration > 0 ? Math.round(p.duration * 10) / 10 : null,
        progress_percent: percent === null ? null : Math.round(percent * 10) / 10,
        completed: p.completed,
        last_watched_at: new Date().toISOString(),
      },
      { onConflict: "user_id,mal_id,episode_number" },
    );
    if (error) throw new Error(error.message);
  });
}

/** Most recent history row per anime (history holds one row per episode). */
export function latestPerAnime(rows: HistoryRow[]) {
  const seen = new Set<number>();
  return rows.filter((r) => (seen.has(r.mal_id) ? false : (seen.add(r.mal_id), true)));
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export async function ensureProfile(userId: string, username?: string | null) {
  const profile: { id: string; username?: string | null } = { id: userId };
  if (username !== undefined) profile.username = username;
  const { error } = await supabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function updateProfile(
  userId: string,
  profile: { username: string; avatar_url: string | null },
) {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...profile }, { onConflict: "id" });
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

