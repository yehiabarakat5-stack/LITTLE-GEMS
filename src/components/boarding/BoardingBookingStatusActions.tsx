import { useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  boardingStatusButtonStyle,
  CANCEL_BOOKING_BUTTON_COLORS,
  getBoardingStatusColorStyle,
  type BoardingCalendarStatusColors,
  type BoardingCalendarStatusKey,
  type BoardingStatusColorStyle,
} from "@/lib/boardingCalendarStatusColors";
import { cn } from "@/lib/utils";

type Room = Database["public"]["Tables"]["rooms"]["Row"];

function StatusColorButton({
  label,
  style,
  onClick,
  disabled,
  pending,
}: {
  label: string;
  style: BoardingStatusColorStyle;
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const colors = boardingStatusButtonStyle(style, hovered);

  return (
    <button
      type="button"
      disabled={disabled || pending}
      className={cn(
        "w-full rounded-md border border-transparent px-3 py-2 text-sm font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-60",
      )}
      style={colors}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {label}
        </span>
      ) : (
        label
      )}
    </button>
  );
}

export type BoardingBookingStatusActionsProps = {
  bookingStatus: Database["public"]["Enums"]["booking_status"];
  statusColors: BoardingCalendarStatusColors;
  isPending: boolean;
  onFollowUp: () => void;
  onCheckInStatus: () => void;
  onStart: () => void;
  onUndoStart: () => void;
  onCompleted: () => void;
  onTakePayment: () => void;
  onCancelBooking: () => void;
  onViewBelongings?: () => void;
};

export function BoardingBookingStatusActions({
  bookingStatus,
  statusColors,
  isPending,
  onFollowUp,
  onCheckInStatus,
  onStart,
  onUndoStart,
  onCompleted,
  onTakePayment,
  onCancelBooking,
  onViewBelongings,
}: BoardingBookingStatusActionsProps) {
  const btn = (key: BoardingCalendarStatusKey) => getBoardingStatusColorStyle(statusColors, key);

  const isCancelled = bookingStatus === "cancelled";
  const canFollowUp = !isCancelled && bookingStatus !== "enquiry";
  const canCheckIn = !isCancelled && (bookingStatus === "enquiry" || bookingStatus === "no_show");
  const canStart = !isCancelled && bookingStatus === "confirmed";
  const canUndoStart = !isCancelled && bookingStatus === "checked_in";
  const canCompleted = !isCancelled && bookingStatus === "checked_in";
  const canTakePayment = !isCancelled && bookingStatus === "checked_out";

  return (
    <div className="flex flex-col gap-2">
      {isCancelled ? (
        <p className="text-sm text-muted-foreground">This booking was cancelled.</p>
      ) : null}

      <StatusColorButton
        label="Follow up"
        style={btn("follow_up")}
        onClick={onFollowUp}
        disabled={!canFollowUp}
        pending={isPending}
      />
      <StatusColorButton
        label="Check in"
        style={btn("check_in")}
        onClick={onCheckInStatus}
        disabled={!canCheckIn}
        pending={isPending}
      />
      <StatusColorButton
        label="Start"
        style={btn("start")}
        onClick={onStart}
        disabled={!canStart}
        pending={isPending}
      />
      <StatusColorButton
        label="Undo start"
        style={btn("undo_start")}
        onClick={onUndoStart}
        disabled={!canUndoStart}
        pending={isPending}
      />
      <StatusColorButton
        label="Completed"
        style={btn("completed")}
        onClick={onCompleted}
        disabled={!canCompleted}
        pending={isPending}
      />
      <StatusColorButton
        label="Take payment"
        style={btn("take_payment")}
        onClick={onTakePayment}
        disabled={!canTakePayment}
        pending={isPending}
      />

      {onViewBelongings && bookingStatus === "checked_in" ? (
        <button
          type="button"
          className="w-full rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted/50"
          onClick={onViewBelongings}
        >
          View belongings
        </button>
      ) : null}

      <StatusColorButton
        label="Cancel Booking"
        style={CANCEL_BOOKING_BUTTON_COLORS}
        onClick={onCancelBooking}
        disabled={isCancelled}
        pending={isPending}
      />
    </div>
  );
}

export function formatRoomPickerLabel(room: {
  display_name?: string | null;
  room_number?: string | null;
  room_type?: string | null;
}): string {
  const name = room.display_name?.trim();
  if (name) return name;
  const num = room.room_number?.trim() ?? "";
  const type = room.room_type?.replace(/_/g, " ") ?? "";
  if (type && num) return `${type} — ${num}`;
  return num || type || "—";
}

export function formatRoomPickerMeta(room: {
  room_type?: string | null;
  capacity_type?: string | null;
}): string {
  const parts = [room.room_type?.replace(/_/g, " "), room.capacity_type].filter(Boolean);
  return parts.join(" · ");
}

export type BoardingRealRoomPickerProps = {
  rooms: Room[];
  value: string;
  onSelect: (roomId: string) => void;
  disabled?: boolean;
  wingOrder: readonly string[];
  wingLabels: Record<string, string>;
  roomsByWing: Map<string, Room[]>;
  formatWingLabel: (wing: string) => string;
};

export function BoardingRealRoomPicker({
  rooms,
  value,
  onSelect,
  disabled,
  wingOrder,
  wingLabels,
  roomsByWing,
  formatWingLabel,
}: BoardingRealRoomPickerProps) {
  const [open, setOpen] = useState(false);
  const selected = rooms.find((r) => r.id === value);

  return (
    <div className="space-y-2">
      <Label>Select real room</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between font-normal"
          >
            {selected
              ? `${wingLabels[selected.wing ?? ""] ?? formatWingLabel(selected.wing ?? "")} | ${formatRoomPickerLabel(selected)}`
              : "Search by name or number…"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command
            filter={(roomId, search) => {
              const r = rooms.find((rm) => rm.id === roomId);
              if (!r) return 0;
              const q = search.toLowerCase();
              const wing = (wingLabels[r.wing ?? ""] ?? formatWingLabel(r.wing ?? "")).toLowerCase();
              if (
                (r.display_name ?? "").toLowerCase().includes(q) ||
                (r.room_number ?? "").toLowerCase().includes(q) ||
                wing.includes(q) ||
                (r.wing ?? "").toLowerCase().includes(q)
              ) {
                return 1;
              }
              return 0;
            }}
          >
            <CommandInput placeholder="Search room name or number…" />
            <CommandList>
              <CommandEmpty>No rooms found.</CommandEmpty>
              {wingOrder.map((wing) => {
                const wingRooms = roomsByWing.get(wing) ?? [];
                if (wingRooms.length === 0) return null;
                return (
                  <CommandGroup key={wing} heading={wingLabels[wing] ?? formatWingLabel(wing)}>
                    {wingRooms.map((r) => (
                      <CommandItem
                        key={r.id}
                        value={r.id}
                        onSelect={(id) => {
                          onSelect(id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === r.id ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="font-medium">{formatRoomPickerLabel(r)}</span>
                        {formatRoomPickerMeta(r) ? (
                          <span className="ml-1.5 text-xs capitalize text-muted-foreground">
                            {formatRoomPickerMeta(r)}
                          </span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                );
              })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
