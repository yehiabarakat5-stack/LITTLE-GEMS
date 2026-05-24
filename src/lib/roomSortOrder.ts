import type { Database } from "@/integrations/supabase/types";

type Room = Database["public"]["Tables"]["rooms"]["Row"];

export function roomSortOrderValue(room: Pick<Room, "sort_order">): number {
  return room.sort_order ?? 0;
}

/** Calendar and room lists use only `sort_order` ascending (stable id tie-break). */
export function sortRoomsBySortOrder<T extends Pick<Room, "id" | "sort_order">>(rooms: T[]): T[] {
  return [...rooms].sort((a, b) => {
    const diff = roomSortOrderValue(a) - roomSortOrderValue(b);
    if (diff !== 0) return diff;
    return a.id.localeCompare(b.id);
  });
}
