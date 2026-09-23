ALTER TABLE public.watch_history
  ADD COLUMN IF NOT EXISTS progress_seconds numeric,
  ADD COLUMN IF NOT EXISTS duration_seconds numeric,
  ADD COLUMN IF NOT EXISTS progress_percent numeric,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false;