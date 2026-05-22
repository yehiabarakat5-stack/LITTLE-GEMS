-- Transportation setup for Little Gems (same as MSH admin-essentials).
-- Run in Supabase SQL Editor if transport is missing from bookings, daycare, or invoices.
-- Mirrors: supabase/migrations/20260523100000_transport_schema_and_pricing.sql

-- Boarding pickup / drop-off
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_required boolean NOT NULL DEFAULT false;

-- Daycare package transport
ALTER TABLE public.daycare_packages
  ADD COLUMN IF NOT EXISTS pickup_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_zone text;

-- Daycare session transport flags
ALTER TABLE public.daycare_sessions
  ADD COLUMN IF NOT EXISTS pickup_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_used boolean NOT NULL DEFAULT false;

-- April 2026 transport rate card
INSERT INTO public.pricing (key, amount_aed, label, category)
VALUES
  ('transport_dubai_shared', 44.38, 'Dubai Taxi — Shared, 1 Dog One-way', 'transport'),
  ('transport_dubai', 125.00, 'Dubai Taxi — Private, up to 3 Family Dogs', 'transport'),
  ('transport_abudhabi', 250.00, 'Other Emirates Pickup — 1 Dog One-way', 'transport')
ON CONFLICT (key) DO UPDATE SET
  amount_aed = EXCLUDED.amount_aed,
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  updated_at = now();

SELECT 'Transport schema and pricing applied' AS status;
