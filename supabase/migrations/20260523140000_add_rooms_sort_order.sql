ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_rooms_sort_order ON public.rooms (sort_order);
