-- Run in Supabase SQL Editor if /settings/rooms shows "No rooms found" while
-- public.rooms has rows in the SQL editor (service role bypasses RLS).
-- Safe to run multiple times.

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rooms_all" ON public.rooms;
DROP POLICY IF EXISTS "rooms_authenticated_all" ON public.rooms;
DROP POLICY IF EXISTS "rooms_authenticated_select" ON public.rooms;
DROP POLICY IF EXISTS "rooms_authenticated_insert" ON public.rooms;
DROP POLICY IF EXISTS "rooms_authenticated_update" ON public.rooms;
DROP POLICY IF EXISTS "rooms_authenticated_delete" ON public.rooms;

CREATE POLICY "rooms_authenticated_all" ON public.rooms
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'rooms authenticated RLS applied' AS status;
