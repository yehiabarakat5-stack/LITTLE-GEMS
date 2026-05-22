/**
 * RoomsAdmin — /settings/rooms
 * Queries only: display_name, color, room_number, max_pets, cam_number,
 * camera_recording, is_active (+ computed status from today's bookings).
 */

import {
  useState,
  useRef,
  useMemo,
  useLayoutEffect,
  useCallback,
  useEffect,
  type Dispatch,
  type SetStateAction,
  type KeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import TopBar from "@/components/dashboard/TopBar";
import { useUpdateRoom, useCreateRoom, useAllRooms } from "@/hooks/useBookings";
import { roomDisplayCategory, type RoomsAdminRoom } from "@/lib/roomsApi";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, Search } from "lucide-react";

const MIN_MAX_PETS = 1;
const MAX_MAX_PETS = 100;
const ROOMS_PAGE_SIZE = 50;

const ROOM_LABEL_PRESET_COLORS = [
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#14B8A6",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#78716C",
  "#FFFFFF",
] as const;

type EditingCell = { id: string; field: string } | null;

type RoomForm = {
  display_name: string;
  room_number: string;
  color: string;
  max_pets: number;
  cam_number: string;
  camera_recording: boolean;
  is_active: boolean;
};

const EMPTY_FORM: RoomForm = {
  display_name: "",
  room_number: "",
  color: "",
  max_pets: MIN_MAX_PETS,
  cam_number: "",
  camera_recording: false,
  is_active: true,
};

function normalizeHexColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(trimmed)) return trimmed.toUpperCase();
  return null;
}

function clampMaxPets(n: number): number {
  if (!Number.isFinite(n)) return MIN_MAX_PETS;
  return Math.min(MAX_MAX_PETS, Math.max(MIN_MAX_PETS, Math.round(n)));
}

function formatMaxPetsForUi(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? String(clampMaxPets(n)) : "";
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatRoomMutationError(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err === "string") return err;
  if (err instanceof Error && err.message.trim()) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return String(err);
}

function roomsSchemaMigrationHint(message: string): string | null {
  const m = message.toLowerCase();
  if (
    m.includes("row-level security") ||
    m.includes("permission denied") ||
    m.includes("42501")
  ) {
    return "Staff cannot read rooms due to RLS. Run sql/rooms-authenticated-rls.sql in the Supabase SQL Editor, then refresh.";
  }
  if (m.includes("color") || m.includes("label_color")) {
    return "The database is missing a room color column. Add rooms.color or rooms.label_color in Supabase, then refresh.";
  }
  if (m.includes("camera_recording")) {
    return "Apply supabase/migrations/20260510120000_add_rooms_camera_recording.sql, then refresh.";
  }
  return null;
}

function toastRoomSaveFailed(err: unknown) {
  const msg = formatRoomMutationError(err);
  const hint = roomsSchemaMigrationHint(msg);
  toast.error(hint ?? `Save failed: ${msg}`, hint ? { duration: 12_000 } : undefined);
}

function roomToForm(room: RoomsAdminRoom): RoomForm {
  return {
    display_name: room.display_name,
    room_number: room.room_number,
    color: normalizeHexColor(room.color) ?? "",
    max_pets: clampMaxPets(room.max_pets),
    cam_number: room.cam_number ?? "",
    camera_recording: room.camera_recording ?? false,
    is_active: room.is_active,
  };
}

function MaxPetsCell({
  room,
  isEditing,
  onOpen,
  onClose,
  onSave,
}: {
  room: RoomsAdminRoom;
  isEditing: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave: (roomId: string, maxPets: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommitRef = useRef(false);
  const wasEditingRef = useRef(false);

  useLayoutEffect(() => {
    if (isEditing && !wasEditingRef.current) {
      const seed = formatMaxPetsForUi(room.max_pets);
      setDraft(seed);
      draftRef.current = seed;
      queueMicrotask(() => inputRef.current?.focus());
    }
    wasEditingRef.current = isEditing;
  }, [isEditing, room]);

  const commitFromBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false;
      return;
    }
    const digits = draftRef.current.replace(/\D/g, "");
    const n = digits === "" ? NaN : parseInt(digits, 10);
    const value = clampMaxPets(Number.isNaN(n) ? MIN_MAX_PETS : n);
    const prevMax = clampMaxPets(Number(room.max_pets));
    onClose();
    if (value !== prevMax) onSave(room.id, value);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        aria-label={`Max pets for ${room.display_name}`}
        className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-right tabular-nums"
        value={draft}
        onChange={(e) => {
          let v = e.target.value.replace(/\D/g, "");
          if (v.length > 3) v = v.slice(0, 3);
          if (v !== "") {
            let num = parseInt(v, 10);
            if (num > MAX_MAX_PETS) num = MAX_MAX_PETS;
            v = String(num);
          }
          draftRef.current = v;
          setDraft(v);
        }}
        onBlur={commitFromBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.currentTarget as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            skipBlurCommitRef.current = true;
            onClose();
          }
        }}
      />
    );
  }

  const displayVal = formatMaxPetsForUi(room.max_pets) || null;
  return (
    <span
      className="block cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-muted/60 transition-colors min-w-[60px] text-right tabular-nums"
      onClick={onOpen}
      title="Click to edit"
    >
      {displayVal ?? <span className="text-muted-foreground">—</span>}
    </span>
  );
}

function RoomColorCell({
  room,
  onSave,
}: {
  room: RoomsAdminRoom;
  onSave: (roomId: string, color: string | null) => void;
}) {
  const color = normalizeHexColor(room.color);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted/60 transition-colors"
          aria-label={`Set color for ${room.display_name}`}
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full border border-border shadow-sm"
            style={{ backgroundColor: color ?? "transparent" }}
          />
          <span className="text-[10px] text-muted-foreground tabular-nums">{color ?? "None"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Room color</p>
        <div className="grid grid-cols-5 gap-2">
          {ROOM_LABEL_PRESET_COLORS.map((preset) => (
            <button
              key={preset}
              type="button"
              title={preset}
              className={`h-7 w-7 rounded-full border transition-transform hover:scale-105 ${
                color === preset ? "ring-2 ring-ring ring-offset-2" : "border-border"
              }`}
              style={{ backgroundColor: preset }}
              onClick={() => onSave(room.id, preset)}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Label htmlFor={`room-color-${room.id}`} className="text-xs shrink-0">
            Custom
          </Label>
          <Input
            id={`room-color-${room.id}`}
            type="color"
            value={color ?? "#3B82F6"}
            className="h-8 w-12 cursor-pointer p-1"
            onChange={(e) => onSave(room.id, e.target.value.toUpperCase())}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-8 w-full text-xs"
          onClick={() => onSave(room.id, null)}
        >
          Clear color
        </Button>
      </PopoverContent>
    </Popover>
  );
}

const RoomsAdminPage = () => {
  const { data: allRooms, isLoading, isFetching, isError, error, refetch } = useAllRooms();
  const updateRoom = useUpdateRoom();
  const createRoom = useCreateRoom();

  const rooms = allRooms ?? [];
  const roomsLoading = isLoading || (isFetching && rooms.length === 0);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("__all__");
  const [categoryFilterSearch, setCategoryFilterSearch] = useState("");
  const [categoryFilterOpen, setCategoryFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ROOMS_PAGE_SIZE);

  const categoryOptions = useMemo(() => {
    const cats = new Set<string>();
    for (const room of rooms) {
      const cat = roomDisplayCategory(room.display_name);
      if (cat) cats.add(cat);
    }
    const sorted = Array.from(cats).sort((a, b) => a.localeCompare(b));
    return [{ value: "__all__", label: "All room types" }, ...sorted.map((c) => ({ value: c, label: c }))];
  }, [rooms]);

  const filteredCategoryOptions = useMemo(() => {
    const q = categoryFilterSearch.trim().toLowerCase();
    if (!q) return categoryOptions;
    return categoryOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [categoryOptions, categoryFilterSearch]);

  const selectedCategoryLabel =
    categoryOptions.find((o) => o.value === categoryFilter)?.label ?? "All room types";

  const { data: occupiedRoomIds } = useQuery({
    queryKey: ["rooms", "occupied-today"],
    queryFn: async () => {
      const today = todayISO();
      const { data, error: qErr } = await supabase
        .from("bookings")
        .select("room_id")
        .lte("check_in_date", today)
        .gte("check_out_date", today)
        .in("status", ["confirmed", "checked_in"]);
      if (qErr) throw qErr;
      return new Set((data ?? []).map((b) => b.room_id));
    },
    refetchInterval: 60_000,
  });

  const filteredRooms = useMemo(() => {
    let result = rooms;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) => {
        const name = r.display_name.toLowerCase();
        const num = r.room_number.toLowerCase();
        const cam = (r.cam_number ?? "").toLowerCase();
        return name.includes(q) || num.includes(q) || cam.includes(q);
      });
    }
    if (categoryFilter !== "__all__") {
      result = result.filter((r) => roomDisplayCategory(r.display_name) === categoryFilter);
    }
    return result;
  }, [rooms, searchQuery, categoryFilter]);

  const visibleRooms = useMemo(
    () => filteredRooms.slice(0, visibleCount),
    [filteredRooms, visibleCount],
  );

  const filteredRoomCount = filteredRooms.length;
  const hasMoreRooms = filteredRoomCount > visibleCount;

  useEffect(() => {
    setVisibleCount(ROOMS_PAGE_SIZE);
  }, [searchQuery, categoryFilter]);

  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editValue, setEditValue] = useState("");
  const latestEditDraftRef = useRef("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [newRoom, setNewRoom] = useState<RoomForm>(EMPTY_FORM);
  const [editingRoom, setEditingRoom] = useState<RoomsAdminRoom | null>(null);
  const [editForm, setEditForm] = useState<RoomForm>(EMPTY_FORM);

  const isEditing = useCallback(
    (id: string, field: string) => editingCell?.id === id && editingCell?.field === field,
    [editingCell],
  );

  const startEdit = useCallback((room: RoomsAdminRoom, field: string, currentVal: string) => {
    setEditingCell({ id: room.id, field });
    setEditValue(currentVal);
    latestEditDraftRef.current = currentVal;
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const commitEdit = useCallback(
    (id: string, field: string, raw: string) => {
      setEditingCell(null);
      const trimmed = raw.trim();
      if (field === "display_name" || field === "room_number") {
        if (!trimmed) return;
        updateRoom.mutate({ id, [field]: trimmed }, { onError: toastRoomSaveFailed });
        return;
      }
      if (field === "cam_number") {
        updateRoom.mutate(
          { id, cam_number: trimmed === "" ? null : trimmed },
          { onError: toastRoomSaveFailed },
        );
      }
    },
    [updateRoom],
  );

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") setEditingCell(null);
  }, []);

  const toggleActive = useCallback(
    (room: RoomsAdminRoom) => {
      updateRoom.mutate(
        { id: room.id, is_active: !room.is_active },
        {
          onSuccess: () =>
            toast.success(
              !room.is_active ? `${room.display_name} is now active` : `${room.display_name} deactivated`,
            ),
          onError: toastRoomSaveFailed,
        },
      );
    },
    [updateRoom],
  );

  const toggleCameraRecording = useCallback(
    (room: RoomsAdminRoom) => {
      updateRoom.mutate(
        { id: room.id, camera_recording: !(room.camera_recording ?? false) },
        { onError: toastRoomSaveFailed },
      );
    },
    [updateRoom],
  );

  const saveMaxPets = useCallback(
    (roomId: string, max_pets: number) => {
      updateRoom.mutate({ id: roomId, max_pets }, { onError: toastRoomSaveFailed });
    },
    [updateRoom],
  );

  const saveRoomColor = useCallback(
    (roomId: string, color: string | null) => {
      updateRoom.mutate(
        { id: roomId, color: normalizeHexColor(color) },
        { onError: toastRoomSaveFailed },
      );
    },
    [updateRoom],
  );

  const openEditRoom = useCallback((room: RoomsAdminRoom) => {
    setEditingRoom(room);
    setEditForm(roomToForm(room));
  }, []);

  const submitEditRoom = useCallback(() => {
    if (!editingRoom) return;
    const name = editForm.display_name.trim();
    const num = editForm.room_number.trim();
    if (!name || !num) {
      toast.error("Room name and room number are required.");
      return;
    }
    updateRoom.mutate(
      {
        id: editingRoom.id,
        display_name: name,
        room_number: num,
        color: normalizeHexColor(editForm.color),
        max_pets: clampMaxPets(editForm.max_pets),
        cam_number: editForm.cam_number.trim() === "" ? null : editForm.cam_number.trim(),
        camera_recording: editForm.camera_recording,
        is_active: editForm.is_active,
      },
      {
        onSuccess: () => {
          toast.success("Room updated");
          setEditingRoom(null);
          setEditForm(EMPTY_FORM);
        },
        onError: toastRoomSaveFailed,
      },
    );
  }, [editingRoom, editForm, updateRoom]);

  const submitNewRoom = useCallback(() => {
    const name = newRoom.display_name.trim();
    const num = newRoom.room_number.trim();
    if (!name || !num) {
      toast.error("Room name and room number are required.");
      return;
    }
    createRoom.mutate(
      {
        display_name: name,
        room_number: num,
        color: normalizeHexColor(newRoom.color),
        max_pets: clampMaxPets(newRoom.max_pets),
        cam_number: newRoom.cam_number.trim() === "" ? null : newRoom.cam_number.trim(),
        camera_recording: newRoom.camera_recording,
        is_active: newRoom.is_active,
      },
      {
        onSuccess: () => {
          toast.success("Room created");
          setAddOpen(false);
          setNewRoom(EMPTY_FORM);
        },
        onError: (err) => {
          const msg = formatRoomMutationError(err);
          const hint = roomsSchemaMigrationHint(msg);
          toast.error(hint ?? msg, hint ? { duration: 12_000 } : undefined);
        },
      },
    );
  }, [newRoom, createRoom]);

  const TextCell = ({
    room,
    field,
    value,
    placeholder = "—",
  }: {
    room: RoomsAdminRoom;
    field: "display_name" | "room_number" | "cam_number";
    value: string | null;
    placeholder?: string;
  }) => {
    const displayVal = value != null && value !== "" ? value : null;

    if (isEditing(room.id, field)) {
      return (
        <input
          ref={inputRef}
          type="text"
          className="w-full rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          value={editValue}
          autoComplete="off"
          onChange={(e) => {
            latestEditDraftRef.current = e.target.value;
            setEditValue(e.target.value);
          }}
          onBlur={() => commitEdit(room.id, field, latestEditDraftRef.current)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            handleKeyDown(e);
          }}
        />
      );
    }

    return (
      <span
        className="block cursor-pointer rounded px-1 py-0.5 -mx-1 hover:bg-muted/60 transition-colors min-w-[60px]"
        onClick={() => startEdit(room, field, displayVal ?? "")}
        title="Click to edit"
      >
        {displayVal ?? <span className="text-muted-foreground">{placeholder}</span>}
      </span>
    );
  };

  return (
    <>
      <TopBar title="Rooms" />
      <main className="flex-1 overflow-auto p-8">
        <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Room Management</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Click any cell to edit inline. Status reflects today&apos;s bookings.
              {rooms.length > 0 && (
                <span className="ml-1 font-medium text-foreground">
                  ({rooms.length} room{rooms.length === 1 ? "" : "s"} loaded)
                </span>
              )}
            </p>
          </div>
          <Button type="button" onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </div>

        {roomsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not load rooms</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                {roomsSchemaMigrationHint(formatRoomMutationError(error)) ??
                  formatRoomMutationError(error)}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : rooms.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted-foreground">No rooms found.</p>
            <p className="text-sm text-muted-foreground max-w-xl">
              If rows exist in the Supabase SQL editor but not here, run{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">sql/rooms-authenticated-rls.sql</code>{" "}
              then refresh.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search room name, number, camera no..."
                className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Popover open={categoryFilterOpen} onOpenChange={setCategoryFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-9 min-w-[200px] justify-between font-normal">
                    {selectedCategoryLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-2" align="start">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={categoryFilterSearch}
                      onChange={(e) => setCategoryFilterSearch(e.target.value)}
                      placeholder="Search room types..."
                      className="h-8 pl-8 text-sm"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {filteredCategoryOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted ${
                          categoryFilter === opt.value ? "bg-muted font-medium" : ""
                        }`}
                        onClick={() => {
                          setCategoryFilter(opt.value);
                          setCategoryFilterOpen(false);
                          setCategoryFilterSearch("");
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                    {filteredCategoryOptions.length === 0 ? (
                      <p className="px-2 py-2 text-xs text-muted-foreground">No matching types</p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="min-w-[180px]">Room name</TableHead>
                    <TableHead className="min-w-[88px] w-[88px] text-center">Color</TableHead>
                    <TableHead className="min-w-[88px] w-[88px] text-center">Room number</TableHead>
                    <TableHead className="text-right min-w-[80px]">Max pets</TableHead>
                    <TableHead className="min-w-[100px]">Camera no</TableHead>
                    <TableHead className="text-center min-w-[120px]">Camera recording</TableHead>
                    <TableHead className="text-center min-w-[100px]">Status</TableHead>
                    <TableHead className="text-center min-w-[80px]">Active</TableHead>
                    <TableHead className="w-[88px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleRooms.map((room) => {
                    const rowColor = normalizeHexColor(room.color);
                    return (
                      <TableRow
                        key={room.id}
                        className={room.is_active ? "" : "opacity-50 bg-muted/20"}
                        style={
                          rowColor ? { boxShadow: `inset 4px 0 0 0 ${rowColor}` } : undefined
                        }
                      >
                        <TableCell>
                          <span className="font-medium flex items-center gap-2 min-w-0">
                            {rowColor ? (
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-full border border-border/60"
                                style={{ backgroundColor: rowColor }}
                              />
                            ) : null}
                            <TextCell room={room} field="display_name" value={room.display_name} />
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <RoomColorCell room={room} onSave={saveRoomColor} />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-block min-w-[2.5rem] font-mono text-sm tabular-nums">
                            <TextCell room={room} field="room_number" value={room.room_number} />
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <MaxPetsCell
                            room={room}
                            isEditing={isEditing(room.id, "max_pets")}
                            onOpen={() => setEditingCell({ id: room.id, field: "max_pets" })}
                            onClose={() => setEditingCell(null)}
                            onSave={saveMaxPets}
                          />
                        </TableCell>
                        <TableCell>
                          <TextCell room={room} field="cam_number" value={room.cam_number} />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1 sm:flex-row sm:justify-center sm:gap-2">
                            <Switch
                              checked={room.camera_recording ?? false}
                              onCheckedChange={() => toggleCameraRecording(room)}
                              aria-label={`Camera recording for ${room.display_name}`}
                            />
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {room.camera_recording ? "Yes" : "No"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {occupiedRoomIds?.has(room.id) ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100 text-[10px] px-1.5">
                              Occupied
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 bg-muted text-muted-foreground border-muted-foreground/30"
                            >
                              Available
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={room.is_active}
                              onCheckedChange={() => toggleActive(room)}
                              aria-label={`Toggle ${room.display_name} active`}
                            />
                            {!room.is_active && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 bg-muted text-muted-foreground border-muted-foreground/30"
                              >
                                Off
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Edit ${room.display_name}`}
                            onClick={() => openEditRoom(room)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {filteredRoomCount > 0 && (
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Showing {visibleRooms.length} of {filteredRoomCount} room
                  {filteredRoomCount === 1 ? "" : "s"}
                </p>
                {hasMoreRooms && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setVisibleCount((c) => c + ROOMS_PAGE_SIZE)}
                  >
                    Load more
                  </Button>
                )}
              </div>
            )}
          </>
        )}

        <Dialog
          open={!!editingRoom}
          onOpenChange={(open) => {
            if (!open) {
              setEditingRoom(null);
              setEditForm(EMPTY_FORM);
            }
          }}
        >
          <DialogContent className="sm:max-w-md print-sans">
            <DialogHeader>
              <DialogTitle>Edit room</DialogTitle>
            </DialogHeader>
            <RoomFormFields form={editForm} setForm={setEditForm} idPrefix="er" />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingRoom(null);
                  setEditForm(EMPTY_FORM);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={submitEditRoom} disabled={updateRoom.isPending}>
                {updateRoom.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="sm:max-w-md print-sans">
            <DialogHeader>
              <DialogTitle>Add Room</DialogTitle>
            </DialogHeader>
            <RoomFormFields form={newRoom} setForm={setNewRoom} idPrefix="nr" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitNewRoom} disabled={createRoom.isPending}>
                {createRoom.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create room"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
};

function RoomFormFields({
  form,
  setForm,
  idPrefix,
}: {
  form: RoomForm;
  setForm: Dispatch<SetStateAction<RoomForm>>;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-4 py-2">
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-name`}>Room name</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.display_name}
          onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
          placeholder="e.g. DELUXE - 1"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-num`}>Room number</Label>
        <Input
          id={`${idPrefix}-num`}
          value={form.room_number}
          onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))}
          placeholder="e.g. 1"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-color`}>Color</Label>
        <Input
          id={`${idPrefix}-color`}
          type="color"
          value={form.color || "#3B82F6"}
          className="h-9 w-16 cursor-pointer p-1"
          onChange={(e) => setForm((f) => ({ ...f, color: e.target.value.toUpperCase() }))}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-max`}>Max pets</Label>
        <Input
          id={`${idPrefix}-max`}
          type="number"
          min={MIN_MAX_PETS}
          max={MAX_MAX_PETS}
          value={form.max_pets}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              max_pets: clampMaxPets(parseInt(e.target.value, 10) || MIN_MAX_PETS),
            }))
          }
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idPrefix}-cam`}>Camera no</Label>
        <Input
          id={`${idPrefix}-cam`}
          value={form.cam_number}
          onChange={(e) => setForm((f) => ({ ...f, cam_number: e.target.value }))}
          placeholder="Optional"
        />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3 gap-3">
        <Label htmlFor={`${idPrefix}-rec`} className="cursor-pointer shrink-0">
          Camera recording
        </Label>
        <Switch
          id={`${idPrefix}-rec`}
          checked={form.camera_recording}
          onCheckedChange={(v) => setForm((f) => ({ ...f, camera_recording: v }))}
        />
      </div>
      <div className="flex items-center justify-between rounded-md border p-3 gap-3">
        <Label htmlFor={`${idPrefix}-active`} className="cursor-pointer shrink-0">
          Active
        </Label>
        <Switch
          id={`${idPrefix}-active`}
          checked={form.is_active}
          onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
        />
      </div>
    </div>
  );
}

export default RoomsAdminPage;
