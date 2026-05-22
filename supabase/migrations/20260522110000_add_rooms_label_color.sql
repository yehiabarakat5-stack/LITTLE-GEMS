ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS label_color text;

COMMENT ON COLUMN public.rooms.label_color IS 'Optional hex color label for staff visual identification (e.g. #3B82F6).';
