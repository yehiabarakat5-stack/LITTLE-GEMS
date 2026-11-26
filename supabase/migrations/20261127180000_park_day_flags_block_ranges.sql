-- Partial block: multiple non-overlapping time windows on one day.
-- Review only. Do not apply until confirmed. No BEGIN/COMMIT.
-- Shared project (Flagship + Little Gems).

-- LG / older DBs may not have the enum value yet.
ALTER TYPE public.park_day_status ADD VALUE IF NOT EXISTS 'partial_block';

ALTER TABLE public.park_day_flags
  ADD COLUMN IF NOT EXISTS block_start time without time zone,
  ADD COLUMN IF NOT EXISTS block_end time without time zone,
  ADD COLUMN IF NOT EXISTS block_ranges jsonb;

COMMENT ON COLUMN public.park_day_flags.block_ranges IS
  'JSON array of { "start": "HH:MM:SS", "end": "HH:MM:SS" } windows when status = partial_block.';

-- Backfill ranges from the legacy single window.
UPDATE public.park_day_flags
SET block_ranges = jsonb_build_array(
  jsonb_build_object(
    'start', to_char(block_start, 'HH24:MI:SS'),
    'end', to_char(block_end, 'HH24:MI:SS')
  )
)
WHERE status = 'partial_block'
  AND block_start IS NOT NULL
  AND block_end IS NOT NULL
  AND (block_ranges IS NULL OR block_ranges = '[]'::jsonb);

ALTER TABLE public.park_day_flags
  DROP CONSTRAINT IF EXISTS park_day_flags_partial_block_times_chk;

ALTER TABLE public.park_day_flags
  ADD CONSTRAINT park_day_flags_partial_block_times_chk
  CHECK (
    (
      status = 'partial_block'
      AND block_ranges IS NOT NULL
      AND jsonb_typeof(block_ranges) = 'array'
      AND jsonb_array_length(block_ranges) >= 1
      AND block_start IS NOT NULL
      AND block_end IS NOT NULL
      AND block_start < block_end
    )
    OR (
      status <> 'partial_block'
      AND block_start IS NULL
      AND block_end IS NULL
      AND (block_ranges IS NULL OR block_ranges = '[]'::jsonb)
    )
  );

NOTIFY pgrst, 'reload schema';

-- Verify:
-- SELECT visit_date, status, block_start, block_end, block_ranges
--   FROM public.park_day_flags WHERE status = 'partial_block' LIMIT 20;
