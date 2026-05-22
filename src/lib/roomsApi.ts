import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Room = Database["public"]["Tables"]["rooms"]["Row"];

/** Columns used by /settings/rooms only */
export type RoomsAdminRoom = {
  id: string;
  display_name: string;
  color: string | null;
  room_number: string;
  max_pets: number;
  cam_number: string | null;
  camera_recording: boolean;
  is_active: boolean;
};

export type RoomsAdminInsert = {
  display_name: string;
  room_number: string;
  color?: string | null;
  max_pets?: number;
  cam_number?: string | null;
  camera_recording?: boolean;
  is_active?: boolean;
};

export type RoomsAdminUpdate = Partial<Omit<RoomsAdminInsert, "display_name" | "room_number">> & {
  display_name?: string;
  room_number?: string;
};

const ROOMS_PAGE_SIZE = 1000;

/** Boarding — only columns that exist on public.rooms */
const ROOMS_BOARDING_SELECT =
  "id, display_name, room_number, wing, room_type, capacity_type, max_pets, is_active";

/** Lighter select for calendar grid + room picker (boarding page). */
const ROOMS_BOARDING_CALENDAR_SELECT =
  "id, display_name, room_number, wing, room_type, capacity_type, is_active";

const ROOMS_ADMIN_SELECT_VARIANTS = [
  "id, display_name, color, room_number, max_pets, cam_number, camera_recording, is_active",
  "id, display_name, label_color, room_number, max_pets, cam_number, camera_recording, is_active",
  "id, display_name, color, room_number, max_pets, camera_recording, is_active",
  "id, display_name, label_color, room_number, max_pets, camera_recording, is_active",
] as const;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err ?? "");
}

function isMissingColumnError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("does not exist") ||
    msg.includes("could not find") ||
    (msg.includes("column") && msg.includes("rooms"))
  );
}

export function isRoomsRlsError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("42501")
  );
}

function normalizeAdminRow(row: Record<string, unknown>): RoomsAdminRoom {
  const colorRaw = row.color ?? row.label_color;
  return {
    id: String(row.id),
    display_name: String(row.display_name ?? ""),
    color: colorRaw == null || colorRaw === "" ? null : String(colorRaw),
    room_number: String(row.room_number ?? ""),
    max_pets: Number(row.max_pets ?? 1),
    cam_number:
      row.cam_number == null || row.cam_number === "" ? null : String(row.cam_number),
    camera_recording: Boolean(row.camera_recording),
    is_active: Boolean(row.is_active ?? true),
  };
}

async function fetchRoomsPage(
  select: string,
  from: number,
  activeOnly: boolean,
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("rooms")
    .select(select)
    .order("display_name", { ascending: true })
    .order("room_number", { ascending: true })
    .range(from, from + ROOMS_PAGE_SIZE - 1);

  if (activeOnly) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Record<string, unknown>[];
}

async function fetchRoomsPaginated(
  select: string,
  activeOnly: boolean,
): Promise<Record<string, unknown>[]> {
  const all: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const batch = await fetchRoomsPage(select, from, activeOnly);
    all.push(...batch);
    if (batch.length < ROOMS_PAGE_SIZE) break;
    from += ROOMS_PAGE_SIZE;
  }

  return all;
}

async function fetchWithSelectVariants(
  variants: readonly string[],
  activeOnly: boolean,
): Promise<Record<string, unknown>[]> {
  let lastError: unknown;
  for (const select of variants) {
    try {
      return await fetchRoomsPaginated(select, activeOnly);
    } catch (err) {
      lastError = err;
      if (!isMissingColumnError(err)) throw err;
    }
  }
  throw lastError;
}

/** Loads rooms for boarding (wing / type / capacity). */
export async function fetchAllRooms(activeOnly = false): Promise<Room[]> {
  const rows = await fetchRoomsPaginated(ROOMS_BOARDING_SELECT, activeOnly);
  return rows as Room[];
}

/** Active rooms only, minimal columns — used by the boarding calendar. */
export async function fetchBoardingCalendarRooms(): Promise<Room[]> {
  const rows = await fetchRoomsPaginated(ROOMS_BOARDING_CALENDAR_SELECT, true);
  return rows as Room[];
}

/** Loads rooms for /settings/rooms (narrow column set). */
export async function fetchRoomsForAdmin(activeOnly = false): Promise<RoomsAdminRoom[]> {
  const rows = await fetchWithSelectVariants(ROOMS_ADMIN_SELECT_VARIANTS, activeOnly);
  return rows.map(normalizeAdminRow);
}

async function mutateWithColorFallback<T>(
  run: (colorField: "color" | "label_color") => Promise<T>,
): Promise<T> {
  try {
    return await run("color");
  } catch (err) {
    if (isMissingColumnError(err)) {
      return run("label_color");
    }
    throw err;
  }
}

export async function updateRoomsAdminRoom(
  id: string,
  updates: RoomsAdminUpdate,
): Promise<RoomsAdminRoom> {
  const { color, ...rest } = updates;
  const payload: Record<string, unknown> = { ...rest };

  return mutateWithColorFallback(async (colorField) => {
    if (color !== undefined) {
      payload[colorField] =
        color == null || color === ""
          ? null
          : color.trim().startsWith("#")
            ? color.trim().toUpperCase()
            : `#${color.trim()}`.toUpperCase();
    }

    const select = ROOMS_ADMIN_SELECT_VARIANTS.find((s) => s.includes(colorField))!;
    const { data, error } = await supabase
      .from("rooms")
      .update(payload)
      .eq("id", id)
      .select(select)
      .single();

    if (error) throw error;
    return normalizeAdminRow(data as Record<string, unknown>);
  });
}

/** Hidden DB defaults — not shown on the admin UI but required for inserts. */
const INSERT_DB_DEFAULTS = {
  wing: "little_gems" as const,
  room_type: "deluxe" as const,
  capacity_type: "single" as const,
};

export async function createRoomsAdminRoom(payload: RoomsAdminInsert): Promise<RoomsAdminRoom> {
  const { color, ...rest } = payload;

  return mutateWithColorFallback(async (colorField) => {
    const insertPayload: Record<string, unknown> = {
      ...INSERT_DB_DEFAULTS,
      display_name: rest.display_name,
      room_number: rest.room_number,
      max_pets: rest.max_pets ?? 1,
      cam_number: rest.cam_number ?? null,
      camera_recording: rest.camera_recording ?? false,
      is_active: rest.is_active ?? true,
    };

    if (color !== undefined) {
      insertPayload[colorField] =
        color == null || color === ""
          ? null
          : color.trim().startsWith("#")
            ? color.trim().toUpperCase()
            : `#${color.trim()}`.toUpperCase();
    }

    const select = ROOMS_ADMIN_SELECT_VARIANTS.find((s) => s.includes(colorField))!;
    const { data, error } = await supabase
      .from("rooms")
      .insert(insertPayload)
      .select(select)
      .single();

    if (error) throw error;
    return normalizeAdminRow(data as Record<string, unknown>);
  });
}

/** Room name prefix before " - " (e.g. "DELUXE - 1" → "DELUXE") for filters. */
export function roomDisplayCategory(displayName: string): string {
  const idx = displayName.lastIndexOf(" - ");
  return idx > 0 ? displayName.slice(0, idx).trim() : displayName.trim();
}
