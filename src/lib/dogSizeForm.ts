/**
 * Dog size captured on Grooming / Daycare / Boarding intake forms.
 *
 * Run in Supabase SQL Editor if these columns are missing:
 *
 * ```sql
 * ALTER TABLE public.grooming_appointments ADD COLUMN IF NOT EXISTS dog_size text;
 * ALTER TABLE public.daycare_sessions ADD COLUMN IF NOT EXISTS dog_size text;
 * ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS dog_size text;
 * ```
 *
 * Until PostgREST reloads its schema cache, hooks persist dog size via `notes` using
 * `appendDogSizeToNotes` / `withoutDogSizeColumn` in `@/lib/dogSizeNotes`.
 *
 * (Daycare check-ins persist to `daycare_sessions`; there is no `daycare_bookings` table in this app.)
 */
export const DOG_SIZE_FORM_OPTIONS = ["Small", "Medium", "Large", "Extra Large"] as const;

/** Boarding and grooming intake — Little Gems serves small and medium dogs only. */
export const LITTLE_GEMS_DOG_SIZE_FORM_OPTIONS = ["Small", "Medium"] as const;

/** Grooming New Appointment form — same as {@link LITTLE_GEMS_DOG_SIZE_FORM_OPTIONS}. */
export const GROOMING_DOG_SIZE_FORM_OPTIONS = LITTLE_GEMS_DOG_SIZE_FORM_OPTIONS;

export type DogSizeFormValue = (typeof DOG_SIZE_FORM_OPTIONS)[number];

export type LittleGemsDogSizeFormValue = (typeof LITTLE_GEMS_DOG_SIZE_FORM_OPTIONS)[number];

export type GroomingDogSizeFormValue = LittleGemsDogSizeFormValue;

export const DEFAULT_DOG_SIZE: DogSizeFormValue = "Medium";
