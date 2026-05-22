-- Little Gems room_types table, enum extensions, and type catalog.
-- Run in Supabase SQL Editor (Step 1). Then run seed-little-gems-rooms-inventory.sql (Step 2).

-- ── Wing enum extensions ─────────────────────────────────────────────────────
ALTER TYPE public.room_wing ADD VALUE IF NOT EXISTS 'little_gems';
ALTER TYPE public.room_wing ADD VALUE IF NOT EXISTS 'lg_resting_nook';

-- ── Room type enum extensions ──────────────────────────────────────────────────
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'deluxe';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'royal';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'standard_luxury';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'little_gems';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'presidential';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'lg_rn';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'lg_rn_big';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'gr';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'fl';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'community_boarding_chalet';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'kitchen';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'waiting_list';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'presidential_double';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'royal_double';
ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS 'little_gems_dbl';

-- ── room_types reference table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.room_types (
  slug text PRIMARY KEY,
  label text NOT NULL,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_types_label_unique UNIQUE (label)
);

CREATE INDEX IF NOT EXISTS idx_room_types_label ON public.room_types (label);

ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_types_authenticated_all" ON public.room_types;
CREATE POLICY "room_types_authenticated_all" ON public.room_types
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

INSERT INTO public.room_types (slug, label, is_builtin) VALUES
  ('deluxe', 'DELUXE', true),
  ('royal', 'ROYAL', true),
  ('standard_luxury', 'STANDARD LUXURY', true),
  ('little_gems', 'LITTLE GEMS', true),
  ('presidential', 'PRESIDENTIAL', true),
  ('lg_rn', 'LG RN', true),
  ('lg_rn_big', 'LG RN (BIG)', true),
  ('gr', 'GR', true),
  ('fl', 'FL', true),
  ('community_boarding_chalet', 'COMMUNITY BOARDING / CHALET', true),
  ('kitchen', 'Kitchen', true),
  ('waiting_list', 'Waiting List', true),
  ('presidential_double', 'PRESIDENTIAL - DOUBLE', true),
  ('royal_double', 'ROYAL - DOUBLE', true),
  ('little_gems_dbl', 'LITTLE GEMS - DBL', true)
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label;

CREATE OR REPLACE FUNCTION public.create_room_type(p_label text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_label text;
BEGIN
  v_label := trim(p_label);
  IF v_label = '' THEN
    RAISE EXCEPTION 'Name is required';
  END IF;

  v_slug := regexp_replace(
    regexp_replace(lower(v_label), '[^a-z0-9]+', '_', 'g'),
    '^_+|_+$',
    '',
    'g'
  );

  IF v_slug = '' THEN
    RAISE EXCEPTION 'Name must contain at least one letter or number';
  END IF;

  IF EXISTS (SELECT 1 FROM public.room_types WHERE slug = v_slug OR label = v_label) THEN
    RAISE EXCEPTION 'Room type already exists';
  END IF;

  EXECUTE format('ALTER TYPE public.room_type ADD VALUE IF NOT EXISTS %L', v_slug);

  INSERT INTO public.room_types (slug, label, is_builtin)
  VALUES (v_slug, v_label, false);

  RETURN v_slug;
END;
$$;

REVOKE ALL ON FUNCTION public.create_room_type(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_room_type(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_room_type(text) TO service_role;

NOTIFY pgrst, 'reload schema';

SELECT 'Little Gems room_types DDL applied' AS status;
