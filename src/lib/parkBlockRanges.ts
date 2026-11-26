/** Partial-block time windows on park_day_flags (stored as HH:MM:SS). */

export type ParkBlockRange = { start: string; end: string };

export function normalizeParkBlockTime(time: string | null | undefined): string {
  if (!time) return "";
  const t = String(time).trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t;
  if (/^\d{2}:\d{2}$/.test(t)) return `${t}:00`;
  return t;
}

export function parkBlockMinutes(time: string): number {
  const [h, m] = normalizeParkBlockTime(time).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function emptyParkBlockRange(defaults?: Partial<ParkBlockRange>): ParkBlockRange {
  return {
    start: defaults?.start ?? "13:00:00",
    end: defaults?.end ?? "17:00:00",
  };
}

/** Prefer block_ranges; fall back to legacy block_start/block_end. */
export function parkBlockRangesFromFlag(flag: {
  block_ranges?: unknown;
  block_start?: string | null;
  block_end?: string | null;
} | null | undefined): ParkBlockRange[] {
  if (!flag) return [];
  const raw = flag.block_ranges;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((r) => {
        if (!r || typeof r !== "object") return null;
        const start = normalizeParkBlockTime(
          (r as { start?: string }).start ?? (r as { block_start?: string }).block_start,
        );
        const end = normalizeParkBlockTime(
          (r as { end?: string }).end ?? (r as { block_end?: string }).block_end,
        );
        if (!start || !end) return null;
        return { start, end };
      })
      .filter((r): r is ParkBlockRange => !!r);
  }
  if (flag.block_start && flag.block_end) {
    return [
      {
        start: normalizeParkBlockTime(flag.block_start),
        end: normalizeParkBlockTime(flag.block_end),
      },
    ];
  }
  return [];
}

export function rangesOverlap(a: ParkBlockRange, b: ParkBlockRange): boolean {
  return (
    parkBlockMinutes(a.start) < parkBlockMinutes(b.end) &&
    parkBlockMinutes(a.end) > parkBlockMinutes(b.start)
  );
}

/** Returns a clear error message, or null when valid. */
export function validateParkBlockRanges(ranges: ParkBlockRange[]): string | null {
  if (!ranges.length) return "Add at least one time range for the partial block.";
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i]!;
    if (!r.start || !r.end) {
      return `Time range ${i + 1}: choose a start and end time.`;
    }
    if (parkBlockMinutes(r.start) >= parkBlockMinutes(r.end)) {
      return `Time range ${i + 1}: end must be after start.`;
    }
  }
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      if (rangesOverlap(ranges[i]!, ranges[j]!)) {
        return `Time ranges ${i + 1} and ${j + 1} overlap. Adjust them so they do not overlap.`;
      }
    }
  }
  return null;
}

export function slotOverlapsAnyParkBlock(
  slotStart: string,
  slotEnd: string,
  ranges: ParkBlockRange[],
): boolean {
  const windowStart = parkBlockMinutes(slotStart);
  const windowEnd = parkBlockMinutes(slotEnd);
  return ranges.some((r) => {
    const blockStartMin = parkBlockMinutes(r.start);
    const blockEndMin = parkBlockMinutes(r.end);
    return windowStart < blockEndMin && windowEnd > blockStartMin;
  });
}

/** Payload fields for upsert: ranges + legacy first-window columns. */
export function parkDayFlagBlockPayload(ranges: ParkBlockRange[]) {
  const sorted = [...ranges].sort(
    (a, b) => parkBlockMinutes(a.start) - parkBlockMinutes(b.start),
  );
  const first = sorted[0]!;
  return {
    block_ranges: sorted.map((r) => ({
      start: normalizeParkBlockTime(r.start),
      end: normalizeParkBlockTime(r.end),
    })),
    block_start: normalizeParkBlockTime(first.start),
    block_end: normalizeParkBlockTime(first.end),
  };
}
