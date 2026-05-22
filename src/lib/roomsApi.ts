import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Room = Database["public"]["Tables"]["rooms"]["Row"];

const ROOMS_PAGE_SIZE = 1000;

const ROOMS_SELECT_WITH_LABEL =
  "id, display_name, room_number, wing, room_type, capacity_type, max_pets, cam_number, camera_recording, is_active, label_color, created_at, pricing_category, pricing_size_tier, nightly_rate, notes, street_name, cam_host, cam_id, cam_username, cam_password";

const ROOMS_SELECT_BASE = ROOMS_SELECT_WITH_LABEL.replace(", label_color", "");

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return String(err ?? "");
}

function isLabelColorColumnError(err: unknown): boolean {
  return errorMessage(err).toLowerCase().includes("label_color");
}

export function isRoomsRlsError(err: unknown): boolean {
  const msg = errorMessage(err).toLowerCase();
  return (
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("42501")
  );
}

async function fetchRoomsPage(
  select: string,
  from: number,
  activeOnly: boolean,
): Promise<Room[]> {
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
  return (data ?? []) as Room[];
}

async function fetchRoomsPaginated(select: string, activeOnly: boolean): Promise<Room[]> {
  const all: Room[] = [];
  let from = 0;

  while (true) {
    const batch = await fetchRoomsPage(select, from, activeOnly);
    all.push(...batch);
    if (batch.length < ROOMS_PAGE_SIZE) break;
    from += ROOMS_PAGE_SIZE;
  }

  return all;
}

/** Loads all rooms (paginated). Set activeOnly to return only active rooms. */
export async function fetchAllRooms(activeOnly = false): Promise<Room[]> {
  try {
    return await fetchRoomsPaginated(ROOMS_SELECT_WITH_LABEL, activeOnly);
  } catch (err) {
    if (isLabelColorColumnError(err)) {
      return fetchRoomsPaginated(ROOMS_SELECT_BASE, activeOnly);
    }
    throw err;
  }
}
