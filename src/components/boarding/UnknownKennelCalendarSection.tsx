import type { ReactNode } from "react";
import type { Database } from "@/integrations/supabase/types";
import {
  groupPlaceholderRoomsByTier,
  IMPORT_PLACEHOLDER_ROW_BG,
} from "@/lib/boardingUnknownKennel";

type Room = Database["public"]["Tables"]["rooms"]["Row"];

type Props = {
  species: "dog" | "cat";
  placeholderRooms: Room[];
  roomColWidth: number;
  dayColWidth: number;
  daysWidth: number;
  renderRoomRow: (roomId: string, isPlaceholder: boolean) => ReactNode;
};

export function UnknownKennelCalendarSection({
  species,
  placeholderRooms,
  roomColWidth,
  dayColWidth,
  daysWidth,
  renderRoomRow,
}: Props) {
  const tierGroups = groupPlaceholderRoomsByTier(placeholderRooms, species);
  if (tierGroups.length === 0) return null;

  return (
    <div className="border-t-2 border-amber-300/80">
      <div
        className={`flex sticky left-0 ${IMPORT_PLACEHOLDER_ROW_BG} border-b border-amber-200`}
        style={{ minWidth: roomColWidth + daysWidth }}
      >
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-900">
          Unknown kennel — assign real room (imported / tier estimate)
        </div>
      </div>

      {tierGroups.map(({ tier, label, rooms }) => (
        <div key={tier}>
          <div
            className={`flex ${IMPORT_PLACEHOLDER_ROW_BG} border-b border-amber-100`}
            style={{ minWidth: roomColWidth + daysWidth }}
          >
            <div
              style={{ minWidth: roomColWidth, width: roomColWidth }}
              className="shrink-0 px-3 py-1 text-[11px] font-semibold text-amber-800/90"
            >
              {label}
            </div>
          </div>
          {rooms.map((room) => (
            <div key={room.id} className="flex">
              <div
                style={{ minWidth: roomColWidth, width: roomColWidth }}
                className={`shrink-0 border-r border-b border-amber-100 flex items-center px-3 text-sm ${IMPORT_PLACEHOLDER_ROW_BG}`}
              >
                <span className="truncate" title={room.display_name}>
                  <span className="font-medium text-amber-950">{room.display_name}</span>
                  <span className="ml-1.5 text-[10px] text-amber-700/80">UNK</span>
                </span>
              </div>
              {renderRoomRow(room.id, true)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
