import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { withoutDogSizeColumn } from "@/lib/dogSizeNotes";
import { extractErrorMessage, isMissingPostgrestColumnError } from "@/lib/errors";
import { sortRoomsBySortOrder } from "@/lib/roomSortOrder";
import {
  createRoomsAdminRoom,
  fetchRoomsForAdmin,
  updateRoomsAdminRoom,
  type RoomsAdminInsert,
  type RoomsAdminUpdate,
} from "@/lib/roomsApi";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
type BookingInsert = Database["public"]["Tables"]["bookings"]["Insert"];
type BookingUpdate = Database["public"]["Tables"]["bookings"]["Update"];
type Room = Database["public"]["Tables"]["rooms"]["Row"];
type BookingPetInsert = Database["public"]["Tables"]["booking_pets"]["Insert"];

export type BookingPetDetail = {
  pet_id: string;
  feeding_notes: string | null;
  medication_notes: string | null;
  special_instructions: string | null;
  pets: {
    name: string;
    other_notes: string | null;
    feeding_instructions: string | null;
    medications: string | null;
    special_alerts: Database["public"]["Tables"]["pets"]["Row"]["special_alerts"];
  } | null;
};

export type BookingWithDetails = Booking & {
  rooms: Room | null;
  owners: { first_name: string; last_name: string; other_notes: string | null } | null;
  booking_pets: BookingPetDetail[];
  /** Populated via `booking_items(count)` for calendar badges */
  booking_items?: { count: number }[];
};

const BOOKING_BASE_SELECT =
  "*, rooms(*), owners(first_name, last_name, other_notes), booking_pets(pet_id, feeding_notes, medication_notes, special_instructions, pets(name, other_notes, feeding_instructions, medications, special_alerts))";

const BOOKING_DETAIL_SELECT =
  `${BOOKING_BASE_SELECT}, booking_items(count)`;

/** Boarding calendar — no rooms(*) join (room comes from useRooms); slim pet embed. */
const BOOKING_CALENDAR_SELECT =
  `id, booking_ref, room_id, owner_id, status, check_in_date, check_out_date, booking_type, notes, do_not_move, pickup_required, dropoff_required, actual_check_in_at, actual_check_out_at, dog_size, camera_link, staff_id, is_extension, is_free_upgrade, created_at, updated_at, owners(first_name, last_name, other_notes), booking_pets(pet_id, feeding_notes, medication_notes, special_instructions, pets(name, other_notes, feeding_instructions, medications, special_alerts)), booking_items(count)`;

const BOOKING_CALENDAR_SELECT_FALLBACK = BOOKING_CALENDAR_SELECT.replace(
  ", booking_items(count)",
  "",
);

/** Columns needed by the boarding grid + room picker (not full room row). */
const ROOMS_BOARDING_SELECT =
  "id, display_name, room_number, wing, room_type, capacity_type, max_pets, is_active, notes, pricing_category, sort_order";

const boardingQueryDefaults = {
  staleTime: 60_000,
  gcTime: 5 * 60_000,
  refetchOnWindowFocus: false,
} as const;

/** Payload accepted by useCreateBooking — booking fields + pet_ids to link */
export type CreateBookingPayload = Omit<BookingInsert, "id" | "created_at" | "updated_at"> & {
  pet_ids: string[];
  pet_care_by_pet_id?: Record<
    string,
    {
      feeding_notes?: string | null;
      medication_notes?: string | null;
      special_instructions?: string | null;
    }
  >;
};

export function isAssessmentRequiredError(error: unknown): boolean {
  return extractErrorMessage(error).includes("has not passed behavioural assessment");
}

const BOOKING_INSERT_OPTIONAL_COLUMNS = [
  "booking_type",
  "pickup_required",
  "dropoff_required",
] as const;

async function insertBookingRow(payload: BookingInsert): Promise<Booking> {
  let current: Record<string, unknown> = { ...payload };

  for (let attempt = 0; attempt <= BOOKING_INSERT_OPTIONAL_COLUMNS.length; attempt++) {
    const { data, error } = await supabase.from("bookings").insert(current).select().single();

    if (!error) {
      return data as Booking;
    }

    const removable = BOOKING_INSERT_OPTIONAL_COLUMNS.find(
      (column) => isMissingPostgrestColumnError(error, column) && column in current,
    );

    if (removable) {
      const { [removable]: _removed, ...rest } = current;
      current = rest;
      continue;
    }

    if (import.meta.env.DEV) {
      console.error("[useCreateBooking] booking insert failed:", error);
    }
    throw error;
  }

  throw new Error("Could not insert booking");
}

export const queryKeys = {
  bookings: (startDate: string, endDate: string) =>
    ["bookings", startDate, endDate] as const,
  ownerBookings: (ownerId: string) => ["bookings", "owner", ownerId] as const,
  petBookings: (petId: string) => ["bookings", "pet", petId] as const,
  rooms: () => ["rooms"] as const,
};

export function useBookings(startDate: string, endDate: string) {
  return useQuery({
    queryKey: queryKeys.bookings(startDate, endDate),
    enabled: !!startDate && !!endDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_DETAIL_SELECT)
        .lte("check_in_date", endDate)
        .gte("check_out_date", startDate)
        .neq("status", "cancelled")
        .order("check_in_date", { ascending: true });

      if (error) {
        if (error.message?.includes("booking_items")) {
          const { data: d2, error: e2 } = await supabase
            .from("bookings")
            .select(BOOKING_BASE_SELECT)
            .lte("check_in_date", endDate)
            .gte("check_out_date", startDate)
            .neq("status", "cancelled")
            .order("check_in_date", { ascending: true });
          if (e2) throw e2;
          return d2 as BookingWithDetails[];
        }
        throw error;
      }
      return data as BookingWithDetails[];
    },
  });
}

async function fetchBoardingCalendarBookings(
  startDate: string,
  endDate: string,
): Promise<BookingWithDetails[]> {
  const run = (select: string, boardingOnly: boolean) => {
    let q = supabase
      .from("bookings")
      .select(select)
      .lte("check_in_date", endDate)
      .gte("check_out_date", startDate)
      .neq("status", "cancelled")
      .order("check_in_date", { ascending: true });
    if (boardingOnly) {
      q = q.eq("booking_type", "boarding");
    }
    return q;
  };

  const { data, error } = await run(BOOKING_CALENDAR_SELECT, true);
  if (!error) return data as BookingWithDetails[];

  if (error.message?.includes("booking_items")) {
    const { data: d2, error: e2 } = await run(BOOKING_CALENDAR_SELECT_FALLBACK, true);
    if (!e2) return d2 as BookingWithDetails[];
    if (e2) throw e2;
  }

  if (error.message?.includes("booking_type")) {
    const { data: d3, error: e3 } = await run(BOOKING_CALENDAR_SELECT, false);
    if (!e3) return d3 as BookingWithDetails[];
  }

  throw error;
}

/** Boarding calendar window — optimized vs full {@link useBookings}. */
export function useBoardingCalendarBookings(
  startDate: string,
  endDate: string,
  fetchEnabled = true,
) {
  return useQuery({
    queryKey: [...queryKeys.bookings(startDate, endDate), "boarding", "calendar"] as const,
    enabled: fetchEnabled && !!startDate && !!endDate,
    ...boardingQueryDefaults,
    queryFn: () => fetchBoardingCalendarBookings(startDate, endDate),
  });
}

export type BoardingPageData = {
  rooms: Room[];
  bookings: BookingWithDetails[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
};

/**
 * Single hook for /boarding — one rooms query + one bookings query (MSH pattern, shared cache).
 */
export function useBoardingPageData(
  startDate: string,
  endDate: string,
  options?: { fetchBookings?: boolean },
): BoardingPageData {
  const fetchBookings = options?.fetchBookings ?? true;
  const roomsQuery = useRooms();
  const bookingsQuery = useBoardingCalendarBookings(startDate, endDate, fetchBookings);

  return {
    rooms: roomsQuery.data ?? [],
    bookings: bookingsQuery.data ?? [],
    isLoading:
      roomsQuery.isLoading || (fetchBookings ? bookingsQuery.isLoading : false),
    isFetching:
      roomsQuery.isFetching || (fetchBookings ? bookingsQuery.isFetching : false),
    error: (roomsQuery.error ?? bookingsQuery.error) as Error | null,
  };
}

/** Past and upcoming stays for a customer profile (includes cancelled). */
export function useOwnerBookings(ownerId: string) {
  return useQuery({
    queryKey: queryKeys.ownerBookings(ownerId),
    enabled: !!ownerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_DETAIL_SELECT)
        .eq("owner_id", ownerId)
        .order("check_in_date", { ascending: false })
        .order("check_out_date", { ascending: false })
        .limit(80);

      if (error) {
        if (error.message?.includes("booking_items")) {
          const { data: d2, error: e2 } = await supabase
            .from("bookings")
            .select(BOOKING_BASE_SELECT)
            .eq("owner_id", ownerId)
            .order("check_in_date", { ascending: false })
            .order("check_out_date", { ascending: false })
            .limit(80);
          if (e2) throw e2;
          return d2 as BookingWithDetails[];
        }
        throw error;
      }
      return data as BookingWithDetails[];
    },
  });
}

/** Stays that include this pet (includes cancelled). Full booking_pets rows for shared stays. */
export function usePetBookings(petId: string) {
  return useQuery({
    queryKey: queryKeys.petBookings(petId),
    enabled: !!petId,
    queryFn: async () => {
      const { data: links, error: e1 } = await supabase
        .from("booking_pets")
        .select("booking_id")
        .eq("pet_id", petId)
        .limit(200);

      if (e1) throw e1;
      const bookingIds = [...new Set((links ?? []).map((r) => r.booking_id))];
      if (bookingIds.length === 0) return [] as BookingWithDetails[];

      const { data, error } = await supabase
        .from("bookings")
        .select(BOOKING_DETAIL_SELECT)
        .in("id", bookingIds)
        .order("check_in_date", { ascending: false })
        .order("check_out_date", { ascending: false })
        .limit(80);

      if (error) {
        if (error.message?.includes("booking_items")) {
          const { data: d2, error: e2 } = await supabase
            .from("bookings")
            .select(BOOKING_BASE_SELECT)
            .in("id", bookingIds)
            .order("check_in_date", { ascending: false })
            .order("check_out_date", { ascending: false })
            .limit(80);
          if (e2) throw e2;
          return d2 as BookingWithDetails[];
        }
        throw error;
      }
      return data as BookingWithDetails[];
    },
  });
}

function dedupeRoomsById(rooms: Room[]): Room[] {
  const seen = new Set<string>();
  const out: Room[] = [];
  for (const room of rooms) {
    if (seen.has(room.id)) continue;
    seen.add(room.id);
    out.push(room);
  }
  return out;
}

/** Active rooms — single shared query for boarding hub + calendars (matches MSH). */
export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms(),
    ...boardingQueryDefaults,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select(ROOMS_BOARDING_SELECT)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) {
        if (isMissingPostgrestColumnError(error, "sort_order")) {
          const { data: d2, error: e2 } = await supabase
            .from("rooms")
            .select(
              "id, display_name, room_number, wing, room_type, capacity_type, max_pets, is_active, notes, pricing_category",
            )
            .eq("is_active", true);
          if (e2) throw e2;
          return dedupeRoomsById(sortRoomsBySortOrder(d2 as Room[]));
        }
        if (error.message?.includes("pricing_category")) {
          const { data: d2, error: e2 } = await supabase
            .from("rooms")
            .select(
              "id, display_name, room_number, wing, room_type, capacity_type, max_pets, is_active, notes",
            )
            .eq("is_active", true);
          if (e2) throw e2;
          return dedupeRoomsById(sortRoomsBySortOrder(d2 as Room[]));
        }
        throw error;
      }
      return dedupeRoomsById(sortRoomsBySortOrder(data as Room[]));
    },
  });
}

/** Dog/cat slice of {@link useRooms} — no extra network request (MSH filters client-side). */
export function useBoardingRooms(species: "dog" | "cat" = "dog") {
  const query = useRooms();
  const data = useMemo(
    () =>
      (query.data ?? []).filter((r) =>
        species === "cat" ? r.wing === "cattery" : r.wing !== "cattery",
      ),
    [query.data, species],
  );
  return { ...query, data };
}

/** Fetches ALL rooms for /settings/rooms (narrow column set). */
export function useAllRooms() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ["rooms", "all"],
    enabled: !!session,
    queryFn: () => fetchRoomsForAdmin(false),
    refetchOnMount: true,
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RoomsAdminUpdate & { id: string }) =>
      updateRoomsAdminRoom(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RoomsAdminInsert) => createRoomsAdminRoom(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: linkedBookings, error: checkErr } = await supabase
        .from("bookings")
        .select("id")
        .eq("room_id", id)
        .limit(1);
      if (checkErr) throw checkErr;
      if (linkedBookings && linkedBookings.length > 0) {
        throw new Error("Cannot delete a room that has bookings assigned to it.");
      }

      const { error } = await supabase.from("rooms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      pet_ids,
      pet_care_by_pet_id,
      dog_size,
      ...bookingData
    }: CreateBookingPayload) => {
      const payload: BookingInsert = {
        ...withoutDogSizeColumn({ ...bookingData, dog_size }),
        booking_type: bookingData.booking_type ?? "boarding",
      };

      const booking = await insertBookingRow(payload);

      if (pet_ids.length > 0) {
        const bookingPets: BookingPetInsert[] = pet_ids.map((pet_id) => ({
          booking_id: booking.id,
          pet_id,
          feeding_notes: pet_care_by_pet_id?.[pet_id]?.feeding_notes ?? null,
          medication_notes: pet_care_by_pet_id?.[pet_id]?.medication_notes ?? null,
          special_instructions: pet_care_by_pet_id?.[pet_id]?.special_instructions ?? null,
        }));

        const { error: petsError } = await supabase
          .from("booking_pets")
          .insert(bookingPets);

        if (petsError) {
          if (import.meta.env.DEV) {
            console.error("[useCreateBooking] booking_pets insert failed:", petsError);
          }
          await supabase.from("bookings").delete().eq("id", booking.id);
          throw petsError;
        }
      }

      return booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useUpdateBooking() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: BookingUpdate & { id: string }) => {
      const payload = withoutDogSizeColumn(updates);
      const { data, error } = await supabase
        .from("bookings")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "checked_in",
          actual_check_in_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase
        .from("bookings")
        .update({
          status: "checked_out",
          actual_check_out_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .select()
        .single();

      if (error) throw error;
      return data as Booking;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}
