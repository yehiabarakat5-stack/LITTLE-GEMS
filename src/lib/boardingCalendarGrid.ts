import { addDays, differenceInCalendarDays, parseISO } from "date-fns";
import type { BookingWithDetails } from "@/hooks/useBookings";

export type RoomDayCell = {
  booking: BookingWithDetails;
  span: number;
  isFirst: boolean;
};

export type RoomDayMap = Map<string, RoomDayCell>;

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Precompute day cells per room so the grid does not rebuild maps on every render. */
export function buildRoomDayBookingMaps(
  bookingsByRoom: Map<string, BookingWithDetails[]>,
  roomIds: readonly string[],
  days: Date[],
  windowStart: Date,
  windowDayCount: number,
): Map<string, RoomDayMap> {
  const result = new Map<string, RoomDayMap>();
  const endOfWindow = toDateStr(addDays(windowStart, windowDayCount));

  for (const roomId of roomIds) {
    const dayBookingMap: RoomDayMap = new Map();
    const roomBookings = bookingsByRoom.get(roomId) ?? [];

    for (const b of roomBookings) {
      for (let idx = 0; idx < days.length; idx++) {
        const day = days[idx]!;
        const dayStr = toDateStr(day);
        if (dayStr < b.check_in_date || dayStr >= b.check_out_date) continue;

        const isFirst = dayStr === b.check_in_date || idx === 0;
        if (isFirst) {
          const chipEnd = b.check_out_date < endOfWindow ? b.check_out_date : endOfWindow;
          const span = differenceInCalendarDays(
            parseISO(chipEnd),
            parseISO(dayStr === b.check_in_date ? b.check_in_date : dayStr),
          );
          dayBookingMap.set(dayStr, { booking: b, span: Math.max(span, 1), isFirst: true });
        } else if (!dayBookingMap.has(dayStr)) {
          dayBookingMap.set(dayStr, { booking: b, span: 1, isFirst: false });
        }
      }
    }

    result.set(roomId, dayBookingMap);
  }

  return result;
}
