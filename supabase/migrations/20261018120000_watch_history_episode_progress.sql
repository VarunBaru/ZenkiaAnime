-- Ensure the user's library tables exist even when the original baseline
-- migration was not applied to this Supabase project.
DO $$
BEGIN
  CREATE TYPE public.watch_status AS ENUM ('planned', 'watching', 'completed', 'on_hold', 'dropped');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id integer NOT NULL,
  title text NOT NULL,
  image_url text,
  media_type text,
  year integer,
  score numeric,
  status public.watch_status NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id)
);

CREATE TABLE IF NOT EXISTS public.watch_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id integer NOT NULL,
  title text NOT NULL,
  image_url text,
  episodes_watched integer NOT NULL DEFAULT 0,
  episode_number integer,
  total_episodes integer,
  progress_seconds numeric,
  duration_seconds numeric,
  progress_percent numeric,
  completed boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Playback progress stores one row per anime episode.
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

CREATE INDEX IF NOT EXISTS watchlist_user_idx
  ON public.watchlist (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS watch_history_user_idx
  ON public.watch_history (user_id, last_watched_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own watchlist" ON public.watchlist;
CREATE POLICY "Users manage own watchlist" ON public.watchlist
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own history" ON public.watch_history;
CREATE POLICY "Users manage own history" ON public.watch_history
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS watchlist_updated_at ON public.watchlist;
CREATE TRIGGER watchlist_updated_at BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

