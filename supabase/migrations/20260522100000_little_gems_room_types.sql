-- Little Gems room_types + enum extensions (run seed migration separately).

ALTER TYPE public.room_wing ADD VALUE IF NOT EXISTS 'little_gems';
ALTER TYPE public.room_wing ADD VALUE IF NOT EXISTS 'lg_resting_nook';

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

CREATE TABLE IF NOT EXISTS public.room_types (
  slug text PRIMARY KEY,
  label text NOT NULL,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_types_label_unique UNIQUE (label)
);

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
