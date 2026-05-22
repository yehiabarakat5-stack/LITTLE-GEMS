import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { formatRoomPickerLabel, formatRoomPickerMeta } from "@/components/boarding/BoardingBookingStatusActions";
import { cn } from "@/lib/utils";

type Room = Database["public"]["Tables"]["rooms"]["Row"];

export type BoardingCalendarRoomFilterProps = {
  rooms: Room[];
  roomsByGroup: Map<string, Room[]>;
  groupKeys: readonly string[];
  groupLabels: Record<string, string>;
  formatGroupLabel?: (group: string) => string;
  selectedRoomId?: string;
  onSelectRoom: (roomId: string) => void;
};

export function BoardingCalendarRoomFilter({
  rooms,
  roomsByGroup,
  groupKeys,
  groupLabels,
  formatGroupLabel,
  selectedRoomId = "",
  onSelectRoom,
}: BoardingCalendarRoomFilterProps) {
  const [open, setOpen] = useState(false);
  const selected = rooms.find((r) => r.id === selectedRoomId);
  const labelForGroup = formatGroupLabel ?? ((group: string) => groupLabels[group] ?? group);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between px-2 text-xs font-normal"
        >
          <span className="truncate">
            {selected ? formatRoomPickerLabel(selected) : "Find room…"}
          </span>
          <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(roomId, search) => {
            const room = rooms.find((r) => r.id === roomId);
            if (!room) return 0;
            const q = search.toLowerCase();
            const groupKey = [...roomsByGroup.entries()].find(([, list]) =>
              list.some((r) => r.id === roomId),
            )?.[0];
            const groupLabel = (groupKey ? labelForGroup(groupKey) : "").toLowerCase();
            if (
              formatRoomPickerLabel(room).toLowerCase().includes(q) ||
              (room.room_number ?? "").toLowerCase().includes(q) ||
              (room.display_name ?? "").toLowerCase().includes(q) ||
              groupLabel.includes(q)
            ) {
              return 1;
            }
            return 0;
          }}
        >
          <CommandInput placeholder="Search room name or number…" />
          <CommandList>
            <CommandEmpty>No rooms found.</CommandEmpty>
            {groupKeys.map((group) => {
              const groupRooms = roomsByGroup.get(group) ?? [];
              if (groupRooms.length === 0) return null;
              return (
                <CommandGroup key={group} heading={labelForGroup(group)}>
                  {groupRooms.map((room) => (
                    <CommandItem
                      key={room.id}
                      value={room.id}
                      onSelect={(roomId) => {
                        onSelectRoom(roomId);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedRoomId === room.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="font-medium">{formatRoomPickerLabel(room)}</span>
                      {formatRoomPickerMeta(room) ? (
                        <span className="ml-1.5 text-xs capitalize text-muted-foreground">
                          {formatRoomPickerMeta(room)}
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
  );
}

export function useCalendarRoomScroll(
  orderedRooms: { id: string }[],
  visibleRoomLimit: number,
  setVisibleRoomLimit: React.Dispatch<React.SetStateAction<number>>,
) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const pendingScrollRoomIdRef = useRef<string | null>(null);
  const [scrollGeneration, setScrollGeneration] = useState(0);
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null);

  const scrollToRoom = useCallback(
    (roomId: string) => {
      const index = orderedRooms.findIndex((r) => r.id === roomId);
      if (index === -1) return;
      pendingScrollRoomIdRef.current = roomId;
      if (index >= visibleRoomLimit) {
        setVisibleRoomLimit((n) => Math.max(n, index + 1));
      }
      setScrollGeneration((g) => g + 1);
    },
    [orderedRooms, visibleRoomLimit, setVisibleRoomLimit],
  );

  useEffect(() => {
    const roomId = pendingScrollRoomIdRef.current;
    if (!roomId) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const el = container.querySelector(`[data-calendar-room-id="${roomId}"]`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    pendingScrollRoomIdRef.current = null;
    setHighlightRoomId(roomId);
    const timer = window.setTimeout(() => setHighlightRoomId(null), 1800);
    return () => window.clearTimeout(timer);
  }, [visibleRoomLimit, scrollGeneration]);

  return { scrollContainerRef, scrollToRoom, highlightRoomId };
}

export function calendarRoomRowClassName(highlightRoomId: string | null, roomId: string): string {
  return cn(
    "flex",
    highlightRoomId === roomId && "bg-primary/5 ring-2 ring-inset ring-primary/50",
  );
}

export function BoardingCalendarRoomCountFooter({
  roomColWidth,
  daysWidth,
  count,
}: {
  roomColWidth: number;
  daysWidth: number;
  count: number;
}) {
  return (
    <div className="flex border-t border-border bg-muted/30">
      <div
        style={{ minWidth: roomColWidth, width: roomColWidth }}
        className="shrink-0 border-r border-border px-3 py-2 text-xs font-medium text-muted-foreground"
      >
        {count} room{count !== 1 ? "s" : ""} total
      </div>
      <div style={{ minWidth: daysWidth, width: daysWidth }} aria-hidden="true" />
    </div>
  );
}
