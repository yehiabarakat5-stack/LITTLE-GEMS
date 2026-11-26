import { addDays, differenceInCalendarDays, differenceInMonths, differenceInYears, format, isValid, parseISO } from "date-fns";

export const DATE_FALLBACK = "—";
export const DUBAI_TIMEZONE = "Asia/Dubai";

/** True when `value` can be parsed to a valid Date. */
export function isValidDateValue(value: unknown): boolean {
  return toSafeDate(value) != null;
}

/** Parse user/API date values without throwing. */
export function toSafeDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === "number") {
    const date = new Date(value);
    return isValid(date) ? date : null;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      const withTime = parseISO(trimmed);
      return isValid(withTime) ? withTime : null;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const dateOnly = parseISO(trimmed);
      return isValid(dateOnly) ? dateOnly : null;
    }
    const date = parseISO(trimmed);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
}

/** Locale string for display; returns fallback when invalid or null. */
export function safeToLocaleString(
  value: unknown,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = DATE_FALLBACK,
): string {
  const date = toSafeDate(value);
  if (!date) return fallback;
  try {
    return date.toLocaleString(locales, options);
  } catch {
    return fallback;
  }
}

/** Locale date string for display; returns fallback when invalid or null. */
export function safeToLocaleDateString(
  value: unknown,
  locales?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions,
  fallback: string = DATE_FALLBACK,
): string {
  const date = toSafeDate(value);
  if (!date) return fallback;
  try {
    return date.toLocaleDateString(locales, options);
  } catch {
    return fallback;
  }
}

/** Format a date value for display; returns fallback when invalid or null. */
export function safeFormatDate(
  value: unknown,
  pattern: string,
  fallback: string = DATE_FALLBACK,
): string {
  const date = toSafeDate(value);
  if (!date) return fallback;
  try {
    return format(date, pattern);
  } catch {
    return fallback;
  }
}

/** Format a timestamp on the Dubai calendar (UAE business day), not browser local time. */
export function safeFormatDateDubai(
  value: unknown,
  fallback: string = DATE_FALLBACK,
): string {
  const date = toSafeDate(value);
  if (!date) return fallback;
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: DUBAI_TIMEZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  } catch {
    return fallback;
  }
}

/** Add days to a date value and format the result. */
export function safeAddDaysFormatted(
  value: unknown,
  amount: number,
  pattern: string,
  fallback: string = DATE_FALLBACK,
): string {
  const date = toSafeDate(value);
  if (!date) return fallback;
  try {
    return format(addDays(date, amount), pattern);
  } catch {
    return fallback;
  }
}

/** Calendar-day difference; null when either side is invalid. */
export function safeDifferenceInCalendarDays(later: unknown, earlier: unknown): number | null {
  const laterDate = toSafeDate(later);
  const earlierDate = toSafeDate(earlier);
  if (!laterDate || !earlierDate) return null;
  try {
    return differenceInCalendarDays(laterDate, earlierDate);
  } catch {
    return null;
  }
}

/** Human-readable pet age from date of birth. */
export function safePetAge(dateOfBirth: unknown, fallback: string = DATE_FALLBACK): string {
  const birth = toSafeDate(dateOfBirth);
  if (!birth) return fallback;
  try {
    const years = differenceInYears(new Date(), birth);
    if (years >= 1) return `${years} yr${years !== 1 ? "s" : ""}`;
    const months = differenceInMonths(new Date(), birth);
    return `${months} mo${months !== 1 ? "s" : ""}`;
  } catch {
    return fallback;
  }
}
