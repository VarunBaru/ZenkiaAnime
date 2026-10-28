-- The production project may be missing the original profiles baseline table.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Profile upgrade: favorites, achievements, follows, profile settings.
DO $$
BEGIN
  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS bio text,
    ADD COLUMN IF NOT EXISTS banner_url text,
    ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS theme_pref text;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mal_id integer NOT NULL,
  title text NOT NULL,
  image_url text,
  media_type text,
  year integer,
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mal_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  icon text,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

CREATE TABLE IF NOT EXISTS public.follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_idx ON public.favorites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS achievements_user_idx ON public.achievements (user_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS follows_follower_idx ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS follows_followee_idx ON public.follows (followee_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.achievements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.favorites TO service_role;
GRANT ALL ON public.achievements TO service_role;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own favorites" ON public.favorites;
CREATE POLICY "Users manage own favorites" ON public.favorites
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own achievements" ON public.achievements;
CREATE POLICY "Users manage own achievements" ON public.achievements
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own follows" ON public.follows;
CREATE POLICY "Users manage own follows" ON public.follows
  FOR ALL TO authenticated USING (auth.uid() = follower_id) WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.profiles;
CREATE POLICY "Anyone can read public profiles" ON public.profiles
  FOR SELECT TO authenticated USING (is_public = true OR auth.uid() = id);

DROP POLICY IF EXISTS "Users manage own profile" ON public.profiles;
CREATE POLICY "Users manage own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);-- Public profiles expose only public profile fields and opted-in profile collections.
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.favorites, public.achievements TO anon, authenticated;
DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.profiles;
CREATE POLICY "Anyone can read public profiles" ON public.profiles
  FOR SELECT TO anon, authenticated USING (is_public = true OR auth.uid() = id);
DROP POLICY IF EXISTS "Read favorites of public profiles" ON public.favorites;
CREATE POLICY "Read favorites of public profiles" ON public.favorites
  FOR SELECT TO anon, authenticated USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.is_public = true)
  );
DROP POLICY IF EXISTS "Read achievements of public profiles" ON public.achievements;
CREATE POLICY "Read achievements of public profiles" ON public.achievements
  FOR SELECT TO anon, authenticated USING (
    auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.is_public = true)
  );

-- Profile images are publicly readable, but only each owner can write to their own folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-media', 'profile-media', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif'];

DROP POLICY IF EXISTS "Public profile media read" ON storage.objects;
CREATE POLICY "Public profile media read" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'profile-media');
DROP POLICY IF EXISTS "Owners upload profile media" ON storage.objects;
CREATE POLICY "Owners upload profile media" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Owners update profile media" ON storage.objects;
CREATE POLICY "Owners update profile media" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "Owners delete profile media" ON storage.objects;
CREATE POLICY "Owners delete profile media" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'profile-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Achievement eligibility is checked against stored activity by the database.
DROP POLICY IF EXISTS "Users manage own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users read own achievements" ON public.achievements;
CREATE POLICY "Users read own achievements" ON public.achievements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.achievements FROM authenticated;
GRANT SELECT ON public.achievements TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.sync_my_achievements()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  account_id uuid := auth.uid();
  watched_count integer;
  saved_count integer;
  completed_count integer;
BEGIN
  IF account_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT count(DISTINCT mal_id) INTO watched_count
  FROM public.watch_history WHERE user_id = account_id;
  SELECT count(*) INTO saved_count FROM public.watchlist WHERE user_id = account_id;
  SELECT count(*) INTO completed_count
  FROM public.watchlist WHERE user_id = account_id AND status = 'completed';

  IF EXISTS (SELECT 1 FROM public.watch_history WHERE user_id = account_id) THEN
    INSERT INTO public.achievements (user_id, key, name, description, icon)
    VALUES (account_id, 'first_watch', 'First Anime Watched', 'Watch your first episode.', '🎬')
    ON CONFLICT (user_id, key) DO NOTHING;
  END IF;
  IF saved_count >= 5 THEN
    INSERT INTO public.achievements (user_id, key, name, description, icon)
    VALUES (account_id, 'beginner', 'Anime Beginner', 'Add 5 anime to your library.', '📺')
    ON CONFLICT (user_id, key) DO NOTHING;
  END IF;
  IF watched_count >= 10 THEN
    INSERT INTO public.achievements (user_id, key, name, description, icon)
    VALUES (account_id, 'binge_watcher', 'Binge Watcher', 'Watch episodes from 10 anime.', '⚡')
    ON CONFLICT (user_id, key) DO NOTHING;
  END IF;
  IF watched_count >= 50 THEN
    INSERT INTO public.achievements (user_id, key, name, description, icon)
    VALUES (account_id, 'anime_master', 'Anime Master', 'Watch episodes from 50 anime.', '👑')
    ON CONFLICT (user_id, key) DO NOTHING;
  END IF;
  IF completed_count >= 10 THEN
    INSERT INTO public.achievements (user_id, key, name, description, icon)
    VALUES (account_id, 'completionist', 'Completionist', 'Complete 10 anime series.', '✅')
    ON CONFLICT (user_id, key) DO NOTHING;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.sync_my_achievements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_my_achievements() TO authenticated;

