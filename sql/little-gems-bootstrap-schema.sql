-- =============================================================================
-- Little Gems — Full Supabase schema bootstrap
-- =============================================================================
-- Generated from admin-essentials codebase (types.ts + sql/ + supabase/migrations/)
--
-- Safe to run on an empty public schema (CREATE IF NOT EXISTS / DROP IF EXISTS).
-- EXCLUDED (by request): rooms, room_types, staff, staff_sessions
--
-- Notes:
-- • bookings.room_id and staff_* uuid columns are kept without FK to excluded tables.
--   Add FK constraints after creating rooms/staff in Little Gems.
-- • Storage buckets (pet-photos, booking-item-photos, etc.) are NOT created here.
-- • Run NOTIFY pgrst, 'reload schema'; after applying.
-- =============================================================================

BEGIN;

-- ── Extensions ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enum types ───────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE public.addon_type AS ENUM (
  'transport_dubai', 'transport_abudhabi', 'grooming_full', 'grooming_bath',
  'grooming_nail', 'grooming_deshedding', 'grooming_brushing', 'other'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.assessment_status AS ENUM (
  'not_assessed', 'passed', 'failed', 'scheduled'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.booking_status AS ENUM (
  'enquiry', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.booking_type AS ENUM (
  'boarding', 'daycare', 'park', 'grooming', 'transport', 'training', 'assessment'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.capacity_type AS ENUM (
  'single', 'twin', 'twin_plus', 'multiple'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.grooming_package AS ENUM (
  'grande', 'bijoux', 'deshedding_long', 'deshedding_smooth', 'bath_blow'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.grooming_service AS ENUM (
  'full_groom', 'full_bath', 'nail_clip', 'deshedding', 'brushing', 'pawdicure'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.invoice_status AS ENUM (
  'draft', 'issued', 'paid', 'partially_paid', 'cancelled',
  'finalised', 'outstanding', 'overdue', 'voided'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.member_type AS ENUM (
  'standard', 'silver', 'gold', 'platinum'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.park_day_status AS ENUM (
  'open', 'closed', 'assessment_only'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.park_size AS ENUM ('small', 'big'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.payment_method AS ENUM ('wallet', 'card', 'cash'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.pet_gender AS ENUM ('male', 'female'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.pet_size_category AS ENUM ('S', 'M', 'L', 'XL'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.room_type AS ENUM (
  'presidential_super', 'presidential_standard', 'royal_suite_double', 'royal_suite_single',
  'double_royal', 'single_royal', 'family_room', 'royal_annex',
  'cattery_super_presidential', 'cattery_presidential', 'cattery_deluxe',
  'park_lane', 'pall_mall', 'kennels'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.room_wing AS ENUM (
  'oxford', 'piccadilly', 'park_lane', 'fleet', 'back_kennels', 'cattery',
  'grooming_upstairs', 'bond_rooms', 'dluxe', 'standard_room', 'import_placeholder'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.species AS ENUM ('dog', 'cat', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.staff_role AS ENUM (
  'booking_coordinator', 'management', 'groomer', 'kennel_staff', 'night_staff', 'admin'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE public.transaction_type AS ENUM (
  'top_up', 'deduction', 'refund', 'membership_fee', 'adjustment',
  'card_payment', 'cash_payment', 'manual_topup'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Helper functions ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── Phase 1: Root tables (no FK parents) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.owners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  phone text,
  phone2 text,
  email text,
  address text,
  nationality text,
  emirates_id text,
  customer_id text,
  member_type public.member_type NOT NULL DEFAULT 'standard',
  membership_date date,
  membership_fee_paid boolean NOT NULL DEFAULT false,
  wallet_balance numeric NOT NULL DEFAULT 0,
  extra_discount_pct numeric,
  deferred_payment boolean,
  always_full_refund boolean,
  always_same_room boolean NOT NULL DEFAULT false,
  camera_required boolean NOT NULL DEFAULT false,
  is_vip boolean NOT NULL DEFAULT false,
  is_msh_owned boolean NOT NULL DEFAULT false,
  low_balance_threshold_override numeric,
  preferred_groomer text,
  vet_name text,
  vet_phone text,
  billing_notes text,
  other_notes text,
  notes text,
  how_heard text,
  notify_birthday boolean NOT NULL DEFAULT true,
  notify_boarding boolean NOT NULL DEFAULT true,
  notify_boarding_reminder boolean NOT NULL DEFAULT true,
  notify_daycare boolean NOT NULL DEFAULT true,
  notify_grooming boolean NOT NULL DEFAULT true,
  notify_vaccination boolean NOT NULL DEFAULT true,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  amount_aed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz,
  updated_by text
);

CREATE TABLE IF NOT EXISTS public.pricing_legacy_archive (
  key text PRIMARY KEY,
  amount_aed numeric NOT NULL,
  label text NOT NULL,
  category text NOT NULL,
  updated_at timestamptz,
  archived_reason text NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dog_breeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vet_clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daycare_package_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  total_days integer NOT NULL,
  base_price_aed numeric NOT NULL,
  num_dogs integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.park_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT 'Park slot',
  price_per_slot_aed numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.park_day_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date date NOT NULL,
  status public.park_day_status NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addon_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  addon_type public.addon_type NOT NULL,
  label text NOT NULL,
  price_aed numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'each',
  applicable_services text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grooming_service_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service public.grooming_service NOT NULL,
  label text NOT NULL,
  price_aed numeric NOT NULL DEFAULT 0,
  duration_minutes integer,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grooming_package_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package public.grooming_package NOT NULL,
  size public.pet_size_category NOT NULL,
  amount_aed numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  UNIQUE (package, size)
);

CREATE TABLE IF NOT EXISTS public.invoice_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id text,
  owner_name text,
  total_amount numeric,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by text,
  reason text
);

CREATE TABLE IF NOT EXISTS public.grooming_appointment_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id text,
  appointment_date text,
  pet_name text,
  owner_name text,
  service text,
  price numeric,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by text,
  reason text
);

CREATE TABLE IF NOT EXISTS public.daycare_package_deletion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id text,
  owner_name text,
  pet_name text,
  total_days integer,
  days_used integer,
  price_paid numeric,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  deleted_by text,
  reason text
);

-- ── Phase 2: Pets & packages ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  name text NOT NULL,
  species public.species NOT NULL DEFAULT 'dog',
  breed text,
  gender public.pet_gender,
  date_of_birth date,
  weight_kg numeric,
  colour text,
  microchip_number text,
  active boolean NOT NULL DEFAULT true,
  size_category public.pet_size_category,
  assessment_status public.assessment_status NOT NULL DEFAULT 'not_assessed',
  assessment_date date,
  assessment_notes text,
  assessed_by text,
  registration_invoiced boolean NOT NULL DEFAULT false,
  behavioural_notes text,
  feeding_instructions text,
  medical_conditions text,
  medications text,
  grooming_notes text,
  other_notes text,
  special_alerts jsonb,
  camera_preferred boolean NOT NULL DEFAULT false,
  photo_url text,
  vet_name text,
  vet_phone text,
  spayed_neutered boolean,
  vaccicheck_report_url text,
  vaccicheck_test_date date,
  vaccicheck_distemper_tier text,
  vaccicheck_parvovirus_tier text,
  vaccicheck_hepatitis_tier text,
  vaccicheck_immunity_rating text,
  vaccicheck_performed_at text,
  vaccicheck_result_mode text DEFAULT 's_class',
  vaccicheck_cdv_value numeric,
  vaccicheck_cpv_value numeric,
  vaccicheck_cav_value numeric,
  vaccicheck_recommendations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daycare_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  package_type_id uuid REFERENCES public.daycare_package_types(id) ON DELETE SET NULL,
  total_days integer NOT NULL,
  days_used integer NOT NULL DEFAULT 0,
  purchase_date date NOT NULL,
  expiry_date date,
  price_paid numeric,
  pickup_included boolean NOT NULL DEFAULT false,
  dropoff_included boolean NOT NULL DEFAULT false,
  transport_zone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vaccinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccine_name text NOT NULL,
  administered_date date,
  expiry_date date NOT NULL,
  document_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Phase 3: Bookings ────────────────────────────────────────────────────────
-- room_id / staff_id: uuid columns only (rooms & staff tables excluded)

CREATE TABLE IF NOT EXISTS public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  room_id uuid NOT NULL,
  staff_id uuid,
  booking_ref text,
  booking_type public.booking_type,
  status public.booking_status NOT NULL DEFAULT 'enquiry',
  check_in_date date NOT NULL,
  check_out_date date NOT NULL,
  actual_check_in_at timestamptz,
  actual_check_out_at timestamptz,
  pickup_required boolean NOT NULL DEFAULT false,
  dropoff_required boolean NOT NULL DEFAULT false,
  notes text,
  dog_size text,
  camera_link text,
  do_not_move boolean NOT NULL DEFAULT false,
  is_extension boolean NOT NULL DEFAULT false,
  extended_from_booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  is_free_upgrade boolean NOT NULL DEFAULT false,
  original_room_type public.room_type,
  upgraded_to_room_type public.room_type,
  upgrade_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  feeding_notes text,
  medication_notes text,
  special_instructions text
);

CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  addon_type public.addon_type NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric,
  total_price numeric,
  scheduled_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('personal', 'food')),
  description text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  condition_notes text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  returned boolean,
  return_status text CHECK (return_status IN ('returned', 'missing', 'damaged')),
  return_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feeding_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  meal_label text NOT NULL,
  meal_time time,
  food_type text,
  amount text,
  special_instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stay_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  timing text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Phase 4: Daycare, grooming, park ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daycare_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.daycare_packages(id) ON DELETE SET NULL,
  session_date date NOT NULL,
  checked_in boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  pickup_used boolean NOT NULL DEFAULT false,
  dropoff_used boolean NOT NULL DEFAULT false,
  dog_size text,
  notes text,
  remark text,
  logged_by text,
  staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feeding_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feeding_schedule_id uuid NOT NULL REFERENCES public.feeding_schedules(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  fed_at timestamptz,
  fed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.medication_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id uuid NOT NULL REFERENCES public.stay_medications(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  given_at timestamptz,
  given_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  staff_id uuid,
  note_date date NOT NULL,
  note_text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grooming_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  pet_id uuid NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  groomer_id uuid,
  service public.grooming_service NOT NULL,
  status text NOT NULL DEFAULT 'new',
  appointment_date date NOT NULL,
  appointment_time time,
  duration_minutes integer,
  price numeric,
  payment_method text,
  dog_size text,
  coat_type text,
  grooming_notes text,
  visit_notes text,
  notes text,
  no_show boolean NOT NULL DEFAULT false,
  checked_in_at timestamptz,
  in_progress_at timestamptz,
  completed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.grooming_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.grooming_appointments(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.park_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  owner_name_raw text,
  pet_name_raw text,
  visit_date date NOT NULL,
  slot_start timestamptz NOT NULL,
  slot_end timestamptz NOT NULL,
  size_lane public.park_size NOT NULL,
  is_assessment boolean NOT NULL DEFAULT false,
  price numeric,
  notes text,
  staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.waiting_list (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.owners(id) ON DELETE SET NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  owner_name_raw text,
  pet_name_raw text,
  requested_check_in date NOT NULL,
  requested_check_out date NOT NULL,
  room_type_requested public.room_type,
  status text NOT NULL DEFAULT 'waiting',
  transport_needed boolean NOT NULL DEFAULT false,
  has_wallet_balance boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.handover_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid,
  shift_date date NOT NULL,
  handover_time timestamptz NOT NULL,
  notes text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Phase 5: Billing & wallet ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  invoice_number text,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  discount_pct numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  subtotal_aed numeric,
  total_aed numeric,
  discount_aed numeric,
  vat_aed numeric,
  amount_paid numeric NOT NULL DEFAULT 0,
  payment_method public.payment_method,
  paid_at timestamptz,
  voided_at timestamptz,
  voided_reason text,
  service_type text,
  service_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  line_total numeric,
  pricing_key text,
  service_type text,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES public.owners(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  adjustment_type text NOT NULL,
  original_amount numeric,
  adjusted_amount numeric,
  reason text NOT NULL DEFAULT '',
  approved_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_topup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  amount_requested numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_by text NOT NULL DEFAULT '',
  requested_at timestamptz DEFAULT now(),
  received_at timestamptz,
  reminder_sent_at timestamptz,
  notes text
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  transaction_type public.transaction_type NOT NULL,
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  payment_method public.payment_method,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  reference_id uuid,
  reference_type text,
  service_type text,
  notes text,
  performed_by text,
  staff_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_dog_breeds_sort ON public.dog_breeds (sort_order, name);
CREATE INDEX IF NOT EXISTS idx_vet_clinics_active_name ON public.vet_clinics (is_active, name);
CREATE INDEX IF NOT EXISTS idx_grooming_package_rates_lookup ON public.grooming_package_rates (package, size);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON public.booking_items (booking_id);
CREATE INDEX IF NOT EXISTS grooming_status_events_appt_idx ON public.grooming_status_events (appointment_id);
CREATE INDEX IF NOT EXISTS grooming_status_events_created_idx ON public.grooming_status_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON public.pets (owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_owner_id ON public.bookings (owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON public.bookings (room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON public.bookings (check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_invoices_owner_id ON public.invoices (owner_id);
CREATE INDEX IF NOT EXISTS idx_grooming_appointments_date ON public.grooming_appointments (appointment_date);
CREATE INDEX IF NOT EXISTS idx_park_bookings_visit_date ON public.park_bookings (visit_date);

-- ── Triggers ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_grooming_package_rates_updated_at ON public.grooming_package_rates;
CREATE TRIGGER trg_grooming_package_rates_updated_at
  BEFORE UPDATE ON public.grooming_package_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_boarding_room_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_conflict RECORD;
BEGIN
  IF COALESCE(NEW.booking_type, 'boarding') <> 'boarding' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;
  IF NEW.room_id IS NULL OR NEW.owner_id IS NULL OR NEW.check_in_date IS NULL OR NEW.check_out_date IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT b.id, b.owner_id, b.check_in_date, b.check_out_date, b.status
  INTO v_conflict
  FROM public.bookings b
  WHERE b.room_id = NEW.room_id
    AND (NEW.id IS NULL OR b.id <> NEW.id)
    AND b.status <> 'cancelled'
    AND COALESCE(b.booking_type, 'boarding') = 'boarding'
    AND b.owner_id <> NEW.owner_id
    AND daterange(b.check_in_date, b.check_out_date, '[)') && daterange(NEW.check_in_date, NEW.check_out_date, '[)')
  LIMIT 1;
  IF FOUND THEN
    RAISE EXCEPTION 'ROOM_OVERLAP_CONFLICT'
      USING ERRCODE = 'check_violation',
            DETAIL = format(
              'Room %s already has booking %s (%s to %s) for a different owner.',
              NEW.room_id, v_conflict.id, v_conflict.check_in_date, v_conflict.check_out_date
            ),
            HINT = 'Choose another room or non-overlapping dates.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_boarding_room_overlap ON public.bookings;
CREATE TRIGGER trg_enforce_boarding_room_overlap
  BEFORE INSERT OR UPDATE OF room_id, owner_id, check_in_date, check_out_date, status, booking_type
  ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_boarding_room_overlap();

CREATE OR REPLACE FUNCTION public.enforce_pet_assessment_on_booking()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pet_assessment ON public.bookings;
CREATE TRIGGER trg_enforce_pet_assessment
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pet_assessment_on_booking();

CREATE OR REPLACE FUNCTION public.enforce_pet_assessment_on_booking_pet()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.assessment_status;
  v_pet_name text;
  v_booking_type public.booking_type;
BEGIN
  SELECT booking_type INTO v_booking_type FROM public.bookings WHERE id = NEW.booking_id;
  IF v_booking_type IN ('grooming', 'assessment') THEN
    RETURN NEW;
  END IF;
  SELECT assessment_status, name INTO v_status, v_pet_name FROM public.pets WHERE id = NEW.pet_id;
  IF v_status IS DISTINCT FROM 'passed' THEN
    RAISE EXCEPTION 'Pet % has not passed behavioural assessment (status=%). Book an assessment via the Park calendar before scheduling %.',
      COALESCE(v_pet_name, NEW.pet_id::text), v_status, COALESCE(v_booking_type::text, 'booking')
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_pet_assessment_booking_pets ON public.booking_pets;
CREATE TRIGGER trg_enforce_pet_assessment_booking_pets
  BEFORE INSERT ON public.booking_pets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pet_assessment_on_booking_pet();

CREATE OR REPLACE FUNCTION public.auto_invoice_registration_on_pass()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_prior_passed int;
  v_is_free boolean;
  v_fee numeric;
  v_invoice_id uuid;
BEGIN
  IF NEW.assessment_status IS DISTINCT FROM 'passed' THEN
    RETURN NEW;
  END IF;
  IF NEW.registration_invoiced = true THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.assessment_status = 'passed' THEN
    RETURN NEW;
  END IF;
  SELECT COUNT(*) INTO v_prior_passed
  FROM public.pets
  WHERE owner_id = NEW.owner_id
    AND assessment_status = 'passed'
    AND registration_invoiced = true
    AND id <> NEW.id;
  v_is_free := ((v_prior_passed + 1) % 3 = 0);
  SELECT amount_aed INTO v_fee FROM public.pricing WHERE key = 'registration_per_dog' LIMIT 1;
  v_fee := COALESCE(v_fee, 500);
  IF v_is_free THEN
    NEW.registration_invoiced := true;
    RETURN NEW;
  END IF;
  INSERT INTO public.invoices (owner_id, status, subtotal, discount_amount, total, service_type, notes)
  VALUES (
    NEW.owner_id, 'finalised', v_fee, 0, ROUND(v_fee * 1.05, 2), 'registration',
    'Registration fee for ' || COALESCE(NEW.name, 'pet ' || NEW.id::text)
      || ' (assessment passed on ' || COALESCE(NEW.assessment_date::text, CURRENT_DATE::text) || ')'
  )
  RETURNING id INTO v_invoice_id;
  INSERT INTO public.invoice_line_items (invoice_id, description, quantity, unit_price, total_price)
  VALUES (v_invoice_id, 'Registration fee — ' || COALESCE(NEW.name, 'Unnamed pet'), 1, v_fee, v_fee);
  NEW.registration_invoiced := true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_registration ON public.pets;
CREATE TRIGGER trg_auto_invoice_registration
  BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_registration_on_pass();

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- Documented policies from repo + authenticated bootstrap for operational tables.

ALTER TABLE public.pricing ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pricing_all" ON public.pricing;
DROP POLICY IF EXISTS "pricing_authenticated_all" ON public.pricing;
CREATE POLICY "pricing_authenticated_all" ON public.pricing
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.billing_adjustments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "billing_adjustments_all" ON public.billing_adjustments;
CREATE POLICY "billing_adjustments_all" ON public.billing_adjustments
  FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_access" ON public.booking_items;
CREATE POLICY "staff_access" ON public.booking_items
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.dog_breeds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dog_breeds_authenticated_all" ON public.dog_breeds;
CREATE POLICY "dog_breeds_authenticated_all" ON public.dog_breeds
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.vet_clinics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vet_clinics_authenticated_all" ON public.vet_clinics;
CREATE POLICY "vet_clinics_authenticated_all" ON public.vet_clinics
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE public.grooming_status_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grooming_status_events_all" ON public.grooming_status_events;
CREATE POLICY "grooming_status_events_all" ON public.grooming_status_events
  FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "grooming_status_events_delete_authenticated" ON public.grooming_status_events;
CREATE POLICY "grooming_status_events_delete_authenticated" ON public.grooming_status_events
  FOR DELETE TO authenticated USING (true);

ALTER TABLE public.grooming_appointment_deletion_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grooming_appointment_deletion_log_insert" ON public.grooming_appointment_deletion_log;
DROP POLICY IF EXISTS "grooming_appointment_deletion_log_select" ON public.grooming_appointment_deletion_log;
CREATE POLICY "grooming_appointment_deletion_log_insert" ON public.grooming_appointment_deletion_log
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "grooming_appointment_deletion_log_select" ON public.grooming_appointment_deletion_log
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.daycare_package_deletion_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated users can insert deletion logs" ON public.daycare_package_deletion_log;
DROP POLICY IF EXISTS "Authenticated users can read deletion logs" ON public.daycare_package_deletion_log;
CREATE POLICY "Authenticated users can insert deletion logs" ON public.daycare_package_deletion_log
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can read deletion logs" ON public.daycare_package_deletion_log
  FOR SELECT TO authenticated USING (true);

-- Bootstrap authenticated access for remaining operational tables (no RLS in repo).
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'owners', 'pets', 'bookings', 'booking_pets', 'booking_addons',
    'daycare_package_types', 'daycare_packages', 'daycare_sessions',
    'feeding_schedules', 'feeding_logs', 'stay_medications', 'medication_logs',
    'daily_notes', 'grooming_appointments', 'grooming_service_rates',
    'grooming_package_rates', 'addon_rates', 'park_bookings', 'park_day_flags',
    'park_rates', 'waiting_list', 'invoices', 'invoice_line_items',
    'wallet_topup_requests', 'wallet_transactions', 'vaccinations',
    'handover_logs', 'invoice_deletion_log', 'pricing_legacy_archive'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "authenticated_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

SELECT 'Little Gems bootstrap schema applied (37 tables, excludes rooms/room_types/staff/staff_sessions)' AS status;
