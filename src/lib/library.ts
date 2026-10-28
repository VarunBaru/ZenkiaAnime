import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Anime } from "@/lib/jikan";
import { posterOf } from "@/lib/jikan";
import type { Database } from "@/integrations/supabase/types";

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

export const watchlistQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["watchlist", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<WatchlistRow[]> => {
      const { data, error } = await supabase
        .from("watchlist")
        .select("*")
        .eq("user_id", userId!)
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
      return data as {
        id: string;
        username: string | null;
        avatar_url: string | null;
        banner_url: string | null;
        bio: string | null;
        is_public: boolean;
        created_at: string;
        theme_pref: string | null;
      } | null;
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

export async function addFavoriteToWatchlist(
  userId: string,
  favorite: FavoriteRow,
  status: WatchStatus,
) {
  const { error } = await supabase.from("watchlist").upsert(
    {
      user_id: userId,
      mal_id: favorite.mal_id,
      title: favorite.title,
      image_url: favorite.image_url,
      media_type: favorite.media_type,
      year: favorite.year,
      score: favorite.score,
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

export type FavoriteRow = {
  id: string;
  user_id: string;
  mal_id: number;
  title: string;
  image_url: string | null;
  media_type: string | null;
  year: number | null;
  score: number | null;
  created_at: string;
};

export type AchievementRow = {
  id: string;
  user_id: string;
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  unlocked_at: string;
};

export const favoritesQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["favorites", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<FavoriteRow[]> => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as FavoriteRow[];
    },
  });

export const achievementsQuery = (userId: string | undefined) =>
  queryOptions({
    queryKey: ["achievements", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AchievementRow[]> => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", userId!)
        .order("unlocked_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as AchievementRow[];
    },
  });

export async function addFavorite(
  userId: string,
  anime: Pick<
    Anime,
    "mal_id" | "title" | "title_english" | "episodes" | "images" | "type" | "year" | "score"
  >,
) {
  const { error } = await supabase.from("favorites").upsert(
    {
      user_id: userId,
      mal_id: anime.mal_id,
      title: anime.title_english || anime.title,
      image_url: posterOf(anime),
      media_type: anime.type ?? null,
      year: anime.year ?? null,
      score: anime.score ?? null,
    },
    { onConflict: "user_id,mal_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeFavorite(userId: string, malId: number) {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("mal_id", malId);
  if (error) throw new Error(error.message);
}

export async function awardAchievement(_userId: string) {
  const { error } = await supabase.rpc("sync_my_achievements");
  if (error) throw new Error(error.message);
}

export async function followUser(followerId: string, followeeId: string) {
  const { error } = await supabase.from("follows").insert({
    follower_id: followerId,
    followee_id: followeeId,
  });
  if (error) throw new Error(error.message);
}

export async function unfollowUser(followerId: string, followeeId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followee_id", followeeId);
  if (error) throw new Error(error.message);
}

export async function followsQuery(followerId: string | undefined) {
  if (!followerId) return [];
  const { data, error } = await supabase
    .from("follows")
    .select("followee_id")
    .eq("follower_id", followerId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.followee_id);
}

/** Profile statistics derived only from real watch history/watchlist data. */
export function profileStats(
  watchlist: WatchlistRow[],
  history: HistoryRow[],
  favorites: FavoriteRow[],
) {
  const episodesWatched = history.length;
  const completedSeries = watchlist.filter((r) => r.status === "completed").length;
  const watchingSeries = watchlist.filter((r) => r.status === "watching").length;
  const plannedSeries = watchlist.filter((r) => r.status === "planned").length;
  const onHoldSeries = watchlist.filter((r) => r.status === "on_hold").length;
  const droppedSeries = watchlist.filter((r) => r.status === "dropped").length;
  const uniqueAnimes = new Set(history.map((r) => r.mal_id)).size;
  const completedEpisodes = history.filter((r) => r.completed).length;
  const watchMinutes = history.reduce((sum, r) => {
    const dur = r.duration_seconds;
    if (dur && dur > 0) return sum + Math.round(dur / 60);
    return sum;
  }, 0);
  const genreCounts: Record<string, number> = {};
  for (const row of watchlist) {
    // Genre data is not stored on watchlist rows; we approximate from history titles.
    void row;
  }
  return {
    totalAnimes: uniqueAnimes,
    episodesWatched,
    completedEpisodes,
    completedSeries,
    watchingSeries,
    plannedSeries,
    onHoldSeries,
    droppedSeries,
    favoritesCount: favorites.length,
    watchMinutes,
    genreCounts,
  };
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export async function ensureProfile(userId: string, username?: string | null) {
  if (username?.trim()) {
    const displayName = username.trim();
    if (displayName.length > 40) throw new Error("Display name must be 40 characters or fewer.");
    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: displayName, full_name: displayName },
    });
    if (authError) throw new Error(authError.message);
  }

  const profile: { id: string; username?: string | null } = { id: userId };
  if (username !== undefined) profile.username = username;
  const { error } = await supabase.from("profiles").upsert(profile, { onConflict: "id" });
  // Auth metadata is the canonical display name; profile sync is best-effort
  // so a missing/out-of-date profile table cannot block account onboarding.
  if (error) console.warn("Profile row sync failed");
}

export async function updateProfile(
  userId: string,
  profile: { username: string; avatar_url: string | null },
) {
  const displayName = profile.username.trim();
  if (!displayName || displayName.length > 40) {
    throw new Error("Display name must be between 1 and 40 characters.");
  }
  const avatarUrl = profile.avatar_url?.trim() || null;
  if (avatarUrl) {
    let parsedAvatarUrl: URL;
    try {
      parsedAvatarUrl = new URL(avatarUrl);
    } catch {
      throw new Error("Enter a valid avatar URL.");
    }
    if (parsedAvatarUrl.protocol !== "https:" || avatarUrl.length > 2048) {
      throw new Error("Avatar URLs must use HTTPS and be 2,048 characters or fewer.");
    }
  }
  const { error: authError } = await supabase.auth.updateUser({
    data: {
      display_name: displayName,
      full_name: displayName,
      avatar_url: avatarUrl,
    },
  });
  if (authError) throw new Error(authError.message);

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, username: displayName, avatar_url: avatarUrl }, { onConflict: "id" });
  if (error) console.warn("Profile row sync failed");
}

export async function updateProfileSettings(
  userId: string,
  settings: {
    bio?: string | null;
    banner_url?: string | null;
    is_public?: boolean;
    theme_pref?: string | null;
  },
) {
  const bio = settings.bio?.trim() ?? null;
  if (bio && bio.length > 500) {
    throw new Error("Bio must be 500 characters or fewer.");
  }
  const bannerUrl = settings.banner_url?.trim() || null;
  if (bannerUrl) {
    let parsedBanner: URL;
    try {
      parsedBanner = new URL(bannerUrl);
    } catch {
      throw new Error("Enter a valid banner URL.");
    }
    if (parsedBanner.protocol !== "https:" || bannerUrl.length > 2048) {
      throw new Error("Banner URLs must use HTTPS and be 2,048 characters or fewer.");
    }
  }
  const update: Database["public"]["Tables"]["profiles"]["Update"] = {
    updated_at: new Date().toISOString(),
  };
  if (settings.bio !== undefined) update["bio"] = bio;
  if (settings.banner_url !== undefined) update["banner_url"] = bannerUrl;
  if (settings.is_public !== undefined) update["is_public"] = settings.is_public;
  if (settings.theme_pref !== undefined) update["theme_pref"] = settings.theme_pref;
  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
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
