UPDATE public.watch_history SET episode_number = GREATEST(1, COALESCE(episodes_watched, 1)) WHERE episode_number IS NULL;
ALTER TABLE public.watch_history ALTER COLUMN episode_number SET DEFAULT 1;
ALTER TABLE public.watch_history ALTER COLUMN episode_number SET NOT NULL;
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS watch_history_user_id_mal_id_key;
ALTER TABLE public.watch_history ADD CONSTRAINT watch_history_user_anime_episode_key UNIQUE (user_id, mal_id, episode_number);
CREATE INDEX IF NOT EXISTS watch_history_user_recent_idx ON public.watch_history (user_id, last_watched_at DESC);