-- Transportation: schema columns + April 2026 rate card (matches MSH admin-essentials).
-- Safe to run multiple times.

-- ── Boarding: pickup / drop-off flags ─────────────────────────────────────────
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS pickup_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.bookings.pickup_required IS 'Customer needs pickup/transport for check-in (to kennel)';
COMMENT ON COLUMN public.bookings.dropoff_required IS 'Customer needs drop-off/transport after check-out (from kennel)';

-- ── Daycare packages: transport at purchase ───────────────────────────────────
ALTER TABLE public.daycare_packages
  ADD COLUMN IF NOT EXISTS pickup_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_included boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_zone text;

COMMENT ON COLUMN public.daycare_packages.pickup_included IS 'Package includes daily pickup transport';
COMMENT ON COLUMN public.daycare_packages.dropoff_included IS 'Package includes daily drop-off transport';
COMMENT ON COLUMN public.daycare_packages.transport_zone IS 'Transport zone slug (e.g. dubai_shared, dubai_private, abudhabi)';

-- ── Daycare sessions: per-day pickup / drop-off usage ─────────────────────────
ALTER TABLE public.daycare_sessions
  ADD COLUMN IF NOT EXISTS pickup_used boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dropoff_used boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.daycare_sessions.pickup_used IS 'Pickup transport used for this session';
COMMENT ON COLUMN public.daycare_sessions.dropoff_used IS 'Drop-off transport used for this session';

-- ── Transport pricing (April 2026 rate card) ──────────────────────────────────
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
