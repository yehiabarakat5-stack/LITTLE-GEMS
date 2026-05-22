import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const BOARDING_CALENDAR_STATUS_COLORS_KEY = "boarding_calendar_status_colors";

export const BOARDING_CALENDAR_STATUS_KEYS = [
  "follow_up",
  "check_in",
  "start",
  "completed",
  "undo",
  "take_payment",
] as const;

export type BoardingCalendarStatusKey = (typeof BOARDING_CALENDAR_STATUS_KEYS)[number];

export const BOARDING_CALENDAR_STATUS_LABELS: Record<BoardingCalendarStatusKey, string> = {
  follow_up: "Follow up",
  check_in: "Check in",
  start: "Start",
  completed: "Completed",
  undo: "Undo",
  take_payment: "Take payment",
};

export type BoardingCalendarStatusColors = Record<BoardingCalendarStatusKey, string>;

export const DEFAULT_BOARDING_CALENDAR_STATUS_COLORS: BoardingCalendarStatusColors = {
  follow_up: "#f59e0b",
  check_in: "#3b82f6",
  start: "#10b981",
  completed: "#64748b",
  undo: "#9333ea",
  take_payment: "#059669",
};

function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
}

export function parseBoardingCalendarStatusColors(
  raw: string | null | undefined,
): BoardingCalendarStatusColors {
  const out = { ...DEFAULT_BOARDING_CALENDAR_STATUS_COLORS };
  if (!raw?.trim()) return out;

  try {
    const parsed = JSON.parse(raw) as Partial<Record<string, string>>;
    for (const key of BOARDING_CALENDAR_STATUS_KEYS) {
      const hex = normalizeHex(parsed[key] ?? "");
      if (hex) out[key] = hex;
    }
  } catch {
    // keep defaults
  }
  return out;
}

export function serializeBoardingCalendarStatusColors(
  colors: BoardingCalendarStatusColors,
): string {
  const payload: BoardingCalendarStatusColors = { ...DEFAULT_BOARDING_CALENDAR_STATUS_COLORS };
  for (const key of BOARDING_CALENDAR_STATUS_KEYS) {
    const hex = normalizeHex(colors[key] ?? "");
    if (hex) payload[key] = hex;
  }
  return JSON.stringify(payload);
}

/** Maps a booking row to one of the configurable calendar color keys. */
export function resolveBoardingCalendarStatusKey(input: {
  status: BookingStatus;
  bookingItemsCount?: number;
}): BoardingCalendarStatusKey {
  if (input.status === "cancelled") return "undo";
  if (
    input.status === "checked_out" &&
    (input.bookingItemsCount ?? 0) > 0
  ) {
    return "take_payment";
  }
  switch (input.status) {
    case "enquiry":
    case "no_show":
      return "follow_up";
    case "confirmed":
      return "check_in";
    case "checked_in":
      return "start";
    case "checked_out":
      return "completed";
    default:
      return "follow_up";
  }
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function contrastingTextColor(hex: string): string {
  const normalized = normalizeHex(hex);
  if (!normalized) return "#ffffff";
  const { r, g, b } = parseHex(normalized);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#ffffff";
}

export function boardingCalendarChipStyle(
  colors: BoardingCalendarStatusColors,
  statusKey: BoardingCalendarStatusKey,
): { backgroundColor: string; color: string } {
  const bg = colors[statusKey] ?? DEFAULT_BOARDING_CALENDAR_STATUS_COLORS[statusKey];
  return {
    backgroundColor: bg,
    color: contrastingTextColor(bg),
  };
}
