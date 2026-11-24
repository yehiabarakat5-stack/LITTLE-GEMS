import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchGroomingPetStayFlagsByDate,
  groomingPetStayKey,
  type GroomingPetStayFlag,
} from "@/lib/groomingPetStay";

export function useGroomingPetStays(
  items: Array<{ petId: string; date: string }>,
) {
  const normalized = useMemo(() => {
    const map = new Map<string, { petId: string; date: string }>();
    for (const item of items) {
      if (!item.petId || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) continue;
      map.set(groomingPetStayKey(item.petId, item.date), item);
    }
    return [...map.values()].sort((a, b) =>
      a.date === b.date ? a.petId.localeCompare(b.petId) : a.date.localeCompare(b.date),
    );
  }, [items]);

  const queryKey = useMemo(
    () => ["grooming", "pet-stays", normalized.map((i) => groomingPetStayKey(i.petId, i.date)).join(",")],
    [normalized],
  );

  return useQuery({
    queryKey,
    enabled: normalized.length > 0,
    staleTime: 30_000,
    queryFn: (): Promise<Record<string, GroomingPetStayFlag>> =>
      fetchGroomingPetStayFlagsByDate(normalized),
  });
}

export function stayForPetDate(
  map: Record<string, GroomingPetStayFlag> | undefined,
  petId: string | null | undefined,
  date: string,
): GroomingPetStayFlag | null {
  if (!map || !petId) return null;
  return map[groomingPetStayKey(petId, date)] ?? null;
}
