-- =============================================================================
-- Little Gems: room types + 143-room inventory seed
-- Run in Supabase SQL Editor in TWO steps (PostgreSQL enum rule):
--
--   STEP 1 — Run from here through "END STEP 1", then wait for success.
--   STEP 2 — Run from "STEP 2" through the end.
--
-- Defaults for all rooms: is_active = true, max_pets = 1, camera_recording = false
-- Idempotent: room_types ON CONFLICT; rooms skip existing display_name.
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1 — Enum extensions + room_types table + type catalog
-- ═══════════════════════════════════════════════════════════════════════════════

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

SELECT 'STEP 1 complete — room types ready. Run STEP 2 next.' AS status;

-- END STEP 1 — Commit this transaction before running STEP 2 below.

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2 — Insert 143 rooms into public.rooms
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO public.rooms (display_name, room_number, wing, room_type, capacity_type, max_pets, is_active, camera_recording)
SELECT v.display_name, v.room_number, v.wing, v.room_type, v.capacity_type, v.max_pets, v.is_active, v.camera_recording
FROM (VALUES
  ('DELUXE - 1', '1', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 2', '2', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 3', '3', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 4', '4', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 5', '5', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 6', '6', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 7', '7', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 8', '8', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 9', '9', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 10', '10', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('DELUXE - 11', '11', 'little_gems'::public.room_wing, 'deluxe'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 12', '12', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 13', '13', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 14', '14', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 15', '15', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 16', '16', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 17', '17', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 18', '18', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 19', '19', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 20', '20', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 21', '21', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 22', '22', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 23', '23', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 24', '24', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 25', '25', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 26', '26', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 27', '27', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('STANDARD LUXURY - 28', '28', 'little_gems'::public.room_wing, 'standard_luxury'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - 29', '29', 'little_gems'::public.room_wing, 'presidential'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - 30', '30', 'little_gems'::public.room_wing, 'presidential'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - 31', '31', 'little_gems'::public.room_wing, 'presidential'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 32', '32', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 33', '33', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 34', '34', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 35', '35', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 36', '36', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 37', '37', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 38', '38', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 39', '39', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 40', '40', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 41', '41', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 42', '42', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 43', '43', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 44', '44', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 45', '45', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 46', '46', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 47', '47', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 48', '48', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 49', '49', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 50', '50', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS (CAMERA 01) - 51', '51', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 52', '52', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 53', '53', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - DOUBLE - 54', '54', 'little_gems'::public.room_wing, 'presidential_double'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 55', '55', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 56', '56', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - 57', '57', 'little_gems'::public.room_wing, 'presidential'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 58', '58', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 59', '59', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - 60', '60', 'little_gems'::public.room_wing, 'presidential'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('PRESIDENTIAL - DOUBLE - 61', '61', 'little_gems'::public.room_wing, 'presidential_double'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - DOUBLE - 62', '62', 'little_gems'::public.room_wing, 'royal_double'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('ROYAL - 63', '63', 'little_gems'::public.room_wing, 'royal'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 64', '64', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - DBL - 65', '65', 'little_gems'::public.room_wing, 'little_gems_dbl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 66', '66', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LITTLE GEMS - 67', '67', 'little_gems'::public.room_wing, 'little_gems'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 1', '1', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN (BIG) - 2', '2', 'lg_resting_nook'::public.room_wing, 'lg_rn_big'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 3', '3', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 4', '4', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 5', '5', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 6', '6', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 7', '7', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 8', '8', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 9', '9', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN (CAMERA 01-YELLOW) - 10', '10', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 11', '11', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 12', '12', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 13', '13', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 14', '14', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 15', '15', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 16', '16', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 17', '17', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 18', '18', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 19', '19', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 20', '20', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 21', '21', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 22', '22', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 23', '23', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN (BIG) - 24', '24', 'lg_resting_nook'::public.room_wing, 'lg_rn_big'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 25', '25', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 26', '26', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 27', '27', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 28', '28', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 29', '29', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 30', '30', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 31', '31', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 32', '32', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN (BIG) - 33', '33', 'lg_resting_nook'::public.room_wing, 'lg_rn_big'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('LG RN - 34', '34', 'lg_resting_nook'::public.room_wing, 'lg_rn'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('GR - 1', '1', 'fleet'::public.room_wing, 'gr'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('GR - 2', '2', 'fleet'::public.room_wing, 'gr'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #1', '1', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #2', '2', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #3', '3', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #4', '4', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #5', '5', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #6', '6', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #7', '7', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #8', '8', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #9', '9', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #10', '10', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #11', '11', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #12', '12', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #13', '13', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #14', '14', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('FL #15', '15', 'fleet'::public.room_wing, 'fl'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 1', '1', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 2', '2', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 3', '3', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 4', '4', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 5', '5', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 6', '6', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 7', '7', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 8', '8', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 9', '9', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 10', '10', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 11', '11', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 12', '12', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 13', '13', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 14', '14', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('COMMUNITY BOARDING/CHALET RATE 15', '15', 'bond_rooms'::public.room_wing, 'community_boarding_chalet'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Kitchen 1', '1', 'grooming_upstairs'::public.room_wing, 'kitchen'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Kitchen 2', '2', 'grooming_upstairs'::public.room_wing, 'kitchen'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Kitchen 3', '3', 'grooming_upstairs'::public.room_wing, 'kitchen'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Kitchen 4', '4', 'grooming_upstairs'::public.room_wing, 'kitchen'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Kitchen 5', '5', 'grooming_upstairs'::public.room_wing, 'kitchen'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Waiting List 1', '1', 'standard_room'::public.room_wing, 'waiting_list'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Waiting List 2', '2', 'standard_room'::public.room_wing, 'waiting_list'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Waiting List 3', '3', 'standard_room'::public.room_wing, 'waiting_list'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Waiting List 4', '4', 'standard_room'::public.room_wing, 'waiting_list'::public.room_type, 'single'::public.capacity_type, 1, true, false),
  ('Waiting List 5', '5', 'standard_room'::public.room_wing, 'waiting_list'::public.room_type, 'single'::public.capacity_type, 1, true, false)
) AS v(display_name, room_number, wing, room_type, capacity_type, max_pets, is_active, camera_recording)
WHERE NOT EXISTS (
  SELECT 1 FROM public.rooms r WHERE r.display_name = v.display_name
);

SELECT '143 room rows attempted (skipped existing display_name)' AS status;

NOTIFY pgrst, 'reload schema';

SELECT 'STEP 2 complete — room inventory seed finished' AS status;
