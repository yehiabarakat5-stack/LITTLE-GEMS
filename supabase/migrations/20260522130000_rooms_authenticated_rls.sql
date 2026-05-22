-- Allow authenticated staff to read and manage rooms (settings page, boarding, etc.).

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
