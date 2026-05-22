-- Run in Supabase SQL Editor if creating bookings fails with RLS / permission errors.

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all" ON public.bookings;
DROP POLICY IF EXISTS "bookings_authenticated_all" ON public.bookings;
CREATE POLICY "bookings_authenticated_all" ON public.bookings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_all" ON public.booking_pets;
DROP POLICY IF EXISTS "booking_pets_authenticated_all" ON public.booking_pets;
CREATE POLICY "booking_pets_authenticated_all" ON public.booking_pets
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

SELECT 'bookings authenticated RLS applied' AS status;
