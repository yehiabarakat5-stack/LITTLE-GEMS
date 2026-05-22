import type { Database } from "@/integrations/supabase/types";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const BOARDING_CALENDAR_STATUS_COLORS_KEY = "boarding_calendar_status_colors";

export const BOARDING_CALENDAR_STATUS_KEYS = [
  "follow_up",
  "check_in",
  "start",
  "undo_start",
  "completed",
  "take_payment",
  "import_placeholder",
] as const;

export type BoardingCalendarStatusKey = (typeof BOARDING_CALENDAR_STATUS_KEYS)[number];

export const BOARDING_CALENDAR_STATUS_LABELS: Record<BoardingCalendarStatusKey, string> = {
  follow_up: "Follow up",
  check_in: "Check in",
  start: "Start",
  undo_start: "Undo start",
  completed: "Completed",
  take_payment: "Take payment",
  import_placeholder: "Import placeholder",
};

export const BOARDING_STATUS_COLOR_FIELDS = ["background", "text", "hover"] as const;

export type BoardingStatusColorField = (typeof BOARDING_STATUS_COLOR_FIELDS)[number];

export type BoardingStatusColorStyle = Record<BoardingStatusColorField, string>;

export type BoardingCalendarStatusColors = Record<BoardingCalendarStatusKey, BoardingStatusColorStyle>;

export const DEFAULT_BOARDING_CALENDAR_STATUS_COLORS: BoardingCalendarStatusColors = {
  follow_up: { background: "#F59E0B", text: "#FFFFFF", hover: "#D97706" },
  check_in: { background: "#3B82F6", text: "#FFFFFF", hover: "#2563EB" },
  start: { background: "#10B981", text: "#FFFFFF", hover: "#059669" },
  undo_start: { background: "#9333EA", text: "#FFFFFF", hover: "#7E22CE" },
  completed: { background: "#64748B", text: "#FFFFFF", hover: "#475569" },
  take_payment: { background: "#059669", text: "#FFFFFF", hover: "#047857" },
  import_placeholder: { background: "#F59E0B", text: "#FFFFFF", hover: "#D97706" },
};

/** Cancel booking button — not editable in settings; fixed destructive palette. */
export const CANCEL_BOOKING_BUTTON_COLORS: BoardingStatusColorStyle = {
  background: "#DC2626",
  text: "#FFFFFF",
  hover: "#B91C1C",
};

const LEGACY_KEY_ALIASES: Record<string, BoardingCalendarStatusKey> = {
  undo: "undo_start",
};

function normalizeHex(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!/^#[0-9A-Fa-f]{6}$/.test(withHash)) return null;
  return withHash.toUpperCase();
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
  if (!normalized) return "#FFFFFF";
  const { r, g, b } = parseHex(normalized);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#111827" : "#FFFFFF";
}

function darkenHex(hex: string, amount = 0.12): string {
  const normalized = normalizeHex(hex);
  if (!normalized) return hex;
  const { r, g, b } = parseHex(normalized);
  const f = 1 - amount;
  const to = (n: number) => Math.max(0, Math.min(255, Math.round(n * f)));
  return `#${to(r).toString(16).padStart(2, "0")}${to(g).toString(16).padStart(2, "0")}${to(b).toString(16).padStart(2, "0")}`.toUpperCase();
}

function styleFromLegacyHex(hex: string): BoardingStatusColorStyle {
  const background = normalizeHex(hex) ?? hex;
  return {
    background,
    text: contrastingTextColor(background),
    hover: darkenHex(background),
  };
}

function parseStyleValue(raw: unknown): BoardingStatusColorStyle | null {
  if (typeof raw === "string") {
    const hex = normalizeHex(raw);
    return hex ? styleFromLegacyHex(hex) : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Partial<Record<BoardingStatusColorField, string>>;
  const background = normalizeHex(obj.background ?? "");
  const text = normalizeHex(obj.text ?? "");
  const hover = normalizeHex(obj.hover ?? "");
  if (!background && !text && !hover) return null;
  const bg = background ?? DEFAULT_BOARDING_CALENDAR_STATUS_COLORS.follow_up.background;
  return {
    background: bg,
    text: text ?? contrastingTextColor(bg),
    hover: hover ?? darkenHex(bg),
  };
}

export function parseBoardingCalendarStatusColors(
  raw: string | null | undefined,
): BoardingCalendarStatusColors {
  const out = structuredClone(DEFAULT_BOARDING_CALENDAR_STATUS_COLORS);
  if (!raw?.trim()) return out;

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [rawKey, value] of Object.entries(parsed)) {
      const key = (LEGACY_KEY_ALIASES[rawKey] ?? rawKey) as BoardingCalendarStatusKey;
      if (!BOARDING_CALENDAR_STATUS_KEYS.includes(key)) continue;
      const style = parseStyleValue(value);
      if (style) out[key] = style;
    }
  } catch {
    // keep defaults
  }
  return out;
}

export function serializeBoardingCalendarStatusColors(
  colors: BoardingCalendarStatusColors,
): string {
  const payload: BoardingCalendarStatusColors = structuredClone(DEFAULT_BOARDING_CALENDAR_STATUS_COLORS);
  for (const key of BOARDING_CALENDAR_STATUS_KEYS) {
    const style = colors[key];
    for (const field of BOARDING_STATUS_COLOR_FIELDS) {
      const hex = normalizeHex(style[field] ?? "");
      if (hex) payload[key][field] = hex;
    }
  }
  return JSON.stringify(payload);
}

export function statusColorsEqual(
  a: BoardingCalendarStatusColors,
  b: BoardingCalendarStatusColors,
): boolean {
  return BOARDING_CALENDAR_STATUS_KEYS.every((key) =>
    BOARDING_STATUS_COLOR_FIELDS.every((field) => a[key][field] === b[key][field]),
  );
}

/** Maps a booking row to one of the configurable calendar color keys. */
export function resolveBoardingCalendarStatusKey(input: {
  status: BookingStatus;
  bookingItemsCount?: number;
  isImportPlaceholder?: boolean;
}): BoardingCalendarStatusKey {
  if (input.isImportPlaceholder) return "import_placeholder";
  if (input.status === "cancelled") return "undo_start";
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

export function getBoardingStatusColorStyle(
  colors: BoardingCalendarStatusColors,
  key: BoardingCalendarStatusKey,
): BoardingStatusColorStyle {
  return colors[key] ?? DEFAULT_BOARDING_CALENDAR_STATUS_COLORS[key];
}

export function boardingCalendarChipStyle(
  colors: BoardingCalendarStatusColors,
  statusKey: BoardingCalendarStatusKey,
): BoardingStatusColorStyle {
  return getBoardingStatusColorStyle(colors, statusKey);
}

export function boardingStatusButtonStyle(
  style: BoardingStatusColorStyle,
  hovered = false,
): { backgroundColor: string; color: string } {
  return {
    backgroundColor: hovered ? style.hover : style.background,
    color: style.text,
  };
}
