-- Optional: live Visit Request alerts without waiting for the 30s poll.
-- Adds visit_requests to the realtime publication so the staff apps can
-- refresh the To do count as soon as the website inserts a row.
-- Review only. Do not apply until confirmed. No BEGIN/COMMIT.
-- Skip if this table is already in supabase_realtime.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'visit_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.visit_requests;
  END IF;
END $$;

-- Verify:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'visit_requests';
