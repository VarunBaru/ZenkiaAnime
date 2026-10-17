-- The initial history schema stored one row per anime. Playback progress now
-- records one row per episode, so upgrade existing databases to the same shape.
ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS episode_number integer,
  ADD COLUMN IF NOT EXISTS progress_seconds numeric,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS progress_percent numeric,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;

UPDATE public.watch_history
SET episode_number = GREATEST(episodes_watched, 1)
WHERE episode_number IS NULL;

ALTER TABLE public.watch_history
  ALTER COLUMN episode_number SET DEFAULT 1,
  ALTER COLUMN episode_number SET NOT NULL;

ALTER TABLE public.watch_history
  DROP CONSTRAINT IF EXISTS watch_history_user_id_mal_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS watch_history_user_anime_episode_idx
  ON public.watch_history (user_id, mal_id, episode_number);
