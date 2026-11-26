-- Client-submitted assessment bookings (profile link / public form) need a
-- reception "seen" flag so staff alerts can clear. Staff-booked assessments
-- (booked_by_staff_id set) are never alerted.
-- Review only. Do not apply until confirmed. No BEGIN/COMMIT.

ALTER TABLE public.park_bookings
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.park_bookings.reviewed_at IS
  'When reception marked a client-submitted assessment booking as seen. NULL = still unhandled for alerts.';
COMMENT ON COLUMN public.park_bookings.reviewed_by IS
  'Staff who marked the client-submitted assessment booking as seen.';

-- Existing assessment bookings start as reviewed so only new ones from now on alert.
UPDATE public.park_bookings
SET reviewed_at = COALESCE(created_at, now())
WHERE is_assessment = true
  AND booked_by_staff_id IS NULL
  AND reviewed_at IS NULL;

CREATE INDEX IF NOT EXISTS park_bookings_unreviewed_client_assessment_idx
  ON public.park_bookings (branch_id, created_at DESC)
  WHERE is_assessment = true
    AND booked_by_staff_id IS NULL
    AND reviewed_at IS NULL;

-- Staff may set the review columns (same update policy as other park booking fields).
GRANT UPDATE (reviewed_at, reviewed_by) ON public.park_bookings TO authenticated;

-- Optional live alerts (skip if already published):
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'park_bookings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.park_bookings;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Verify:
-- SELECT column_name FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'park_bookings'
--     AND column_name IN ('reviewed_at', 'reviewed_by');
-- SELECT COUNT(*) FROM public.park_bookings
--   WHERE is_assessment AND booked_by_staff_id IS NULL AND reviewed_at IS NULL;
