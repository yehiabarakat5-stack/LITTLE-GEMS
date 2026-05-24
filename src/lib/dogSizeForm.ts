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

/** Little Gems serves small and medium dogs only. */
export const DOG_SIZE_FORM_OPTIONS = ["Small", "Medium"] as const;

export const LITTLE_GEMS_DOG_SIZE_FORM_OPTIONS = DOG_SIZE_FORM_OPTIONS;
export const GROOMING_DOG_SIZE_FORM_OPTIONS = DOG_SIZE_FORM_OPTIONS;

export type DogSizeFormValue = (typeof DOG_SIZE_FORM_OPTIONS)[number];
export type LittleGemsDogSizeFormValue = DogSizeFormValue;
export type GroomingDogSizeFormValue = DogSizeFormValue;

export const DEFAULT_DOG_SIZE: DogSizeFormValue = "Medium";

/** Pet profile / grooming rate grid size keys (S/M only at Little Gems). */
export const LITTLE_GEMS_PET_SIZE_CATEGORIES = ["S", "M"] as const;
export type LittleGemsPetSizeCategory = (typeof LITTLE_GEMS_PET_SIZE_CATEGORIES)[number];

export const LITTLE_GEMS_PET_SIZE_LABELS: Record<LittleGemsPetSizeCategory, string> = {
  S: "Small (up to 10kg)",
  M: "Medium (10–20kg)",
};

/** Map weight (kg) to pet size category; caps at Medium for Little Gems. */
export function inferLittleGemsPetSizeCategory(
  weightKg: number | null | undefined,
): LittleGemsPetSizeCategory | null {
  if (weightKg == null || Number.isNaN(weightKg)) return null;
  return weightKg < 10 ? "S" : "M";
}
