/**
 * Live boarding / daycare context for a pet on a grooming date.
 * Read-only — never written onto the grooming appointment.
 */
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type GroomingBoardingStayFlag = {
  roomLabel: string | null;
  checkInDate: string;
  checkOutDate: string;
};

export type GroomingDaycareStayFlag = {
  status: string | null;
  checkedIn: boolean;
  checkedOut: boolean;
};

export type GroomingPetStayFlag = {
  boarding: GroomingBoardingStayFlag | null;
  daycare: GroomingDaycareStayFlag | null;
};

type RoomJoin = { room_number?: string | null; display_name?: string | null } | null;

const BOARDING_EXCLUDED = new Set(["cancelled", "no_show", "draft"]);

function roomLabelFrom(room: RoomJoin): string | null {
  if (!room) return null;
  const number = room.room_number?.trim();
  const name = room.display_name?.trim();
  if (number && name && number !== name) return `${number} · ${name}`;
  return number || name || null;
}

function shortDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM");
  } catch {
    return iso;
  }
}

function boardingActiveOnDate(
  booking: { check_in_date: string; check_out_date: string; status?: string | null },
  asOf: string,
): boolean {
  if (BOARDING_EXCLUDED.has(String(booking.status || ""))) return false;
  return booking.check_in_date <= asOf && booking.check_out_date >= asOf;
}

function daycareCheckedIn(row: {
  status: string | null;
  checked_in: boolean | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
}): boolean {
  if (row.checked_out_at) return false;
  if (row.checked_in) return true;
  if (row.checked_in_at) return true;
  const status = String(row.status || "").toLowerCase();
  return status === "arrived" || status === "confirmed";
}

export function groomingPetIdentityLine(input: {
  breed?: string | null;
  colour?: string | null;
  ownerLastName?: string | null;
}): string {
  const traits = [input.breed?.trim(), input.colour?.trim()].filter(Boolean).join(", ");
  const last = input.ownerLastName?.trim() || "";
  if (traits && last) return `${traits} · ${last}`;
  return traits || last || "";
}

export function formatGroomingBoardingStayLine(boarding: GroomingBoardingStayFlag): string {
  const room = boarding.roomLabel ? `Room ${boarding.roomLabel}` : null;
  const dates =
    boarding.checkInDate && boarding.checkOutDate
      ? `${shortDate(boarding.checkInDate)} → ${shortDate(boarding.checkOutDate)}`
      : null;
  return ["🏨 In Boarding", room, dates].filter(Boolean).join(" · ");
}

export function formatGroomingDaycareStayLine(daycare: GroomingDaycareStayFlag): string {
  let status = "";
  if (daycare.checkedOut) status = "checked out";
  else if (daycare.checkedIn) status = "checked in";
  else if (daycare.status && daycare.status !== "expected") status = daycare.status.replace(/_/g, " ");
  return status ? `☀️ In Daycare · ${status}` : "☀️ In Daycare";
}

export function groomingPetStayKey(petId: string, date: string): string {
  return `${petId}|${date}`;
}

export async function fetchGroomingPetStayFlagsByDate(
  items: Array<{ petId: string; date: string }>,
): Promise<Record<string, GroomingPetStayFlag>> {
  const pairs = items.filter((i) => i.petId && /^\d{4}-\d{2}-\d{2}$/.test(i.date));
  const out: Record<string, GroomingPetStayFlag> = {};
  for (const { petId, date } of pairs) {
    out[groomingPetStayKey(petId, date)] = { boarding: null, daycare: null };
  }
  const ids = [...new Set(pairs.map((p) => p.petId))];
  const dates = [...new Set(pairs.map((p) => p.date))].sort();
  if (!ids.length || !dates.length) return out;

  const firstDay = dates[0];
  const lastDay = dates[dates.length - 1];

  const [{ data: boardingRows, error: boardingErr }, { data: daycareRows, error: daycareErr }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          `
          id, check_in_date, check_out_date, status,
          rooms(room_number, display_name),
          booking_pets!inner(pet_id, room_id, rooms:room_id(room_number, display_name))
        `,
        )
        .eq("booking_type", "boarding")
        .in("status", ["confirmed", "checked_in", "in_progress", "checked_out"])
        .in("booking_pets.pet_id", ids)
        .lte("check_in_date", lastDay)
        .gte("check_out_date", firstDay)
        .limit(400),
      supabase
        .from("daycare_sessions")
        .select("pet_id, session_date, status, checked_in, checked_in_at, checked_out_at")
        .in("session_date", dates)
        .in("pet_id", ids)
        .neq("status", "rejected")
        .limit(400),
    ]);

  if (boardingErr) throw boardingErr;
  if (daycareErr) throw daycareErr;

  const needed = new Set(Object.keys(out));

  for (const stay of boardingRows ?? []) {
    const bookingRoom = roomLabelFrom(stay.rooms as RoomJoin);
    for (const bp of stay.booking_pets ?? []) {
      const petId = bp.pet_id;
      if (!petId) continue;
      const petRoom = roomLabelFrom(bp.rooms as RoomJoin);
      const roomLabel = petRoom || bookingRoom;
      for (const date of dates) {
        const key = groomingPetStayKey(petId, date);
        if (!needed.has(key) || out[key].boarding) continue;
        if (!boardingActiveOnDate(stay, date)) continue;
        out[key].boarding = {
          roomLabel,
          checkInDate: stay.check_in_date,
          checkOutDate: stay.check_out_date,
        };
      }
    }
  }

  for (const row of daycareRows ?? []) {
    const petId = row.pet_id;
    const date = row.session_date;
    if (!petId || !date) continue;
    const key = groomingPetStayKey(petId, date);
    if (!needed.has(key) || out[key].daycare) continue;
    const checkedOut =
      Boolean(row.checked_out_at) || String(row.status || "").toLowerCase() === "checked_out";
    out[key].daycare = {
      status: row.status,
      checkedIn: daycareCheckedIn(row),
      checkedOut,
    };
  }

  return out;
}

export async function fetchGroomingPetStayFlags(
  petIds: string[],
  asOf: string,
): Promise<Record<string, GroomingPetStayFlag>> {
  const byKey = await fetchGroomingPetStayFlagsByDate(
    petIds.filter(Boolean).map((petId) => ({ petId, date: asOf })),
  );
  const out: Record<string, GroomingPetStayFlag> = {};
  for (const petId of petIds) {
    out[petId] = byKey[groomingPetStayKey(petId, asOf)] ?? { boarding: null, daycare: null };
  }
  return out;
}
