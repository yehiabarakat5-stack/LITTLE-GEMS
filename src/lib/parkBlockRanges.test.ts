import { describe, expect, it } from "vitest";
import {
  parkBlockRangesFromFlag,
  parkDayFlagBlockPayload,
  slotOverlapsAnyParkBlock,
  validateParkBlockRanges,
} from "./parkBlockRanges";

describe("parkBlockRanges", () => {
  it("reads legacy single window", () => {
    expect(
      parkBlockRangesFromFlag({
        block_start: "08:00:00",
        block_end: "10:00:00",
      }),
    ).toEqual([{ start: "08:00:00", end: "10:00:00" }]);
  });

  it("validates end after start and mutual overlaps", () => {
    expect(
      validateParkBlockRanges([
        { start: "08:00:00", end: "10:00:00" },
        { start: "16:00:00", end: "18:00:00" },
      ]),
    ).toBeNull();
    expect(
      validateParkBlockRanges([{ start: "10:00:00", end: "09:00:00" }]),
    ).toMatch(/end must be after start/i);
    expect(
      validateParkBlockRanges([
        { start: "08:00:00", end: "12:00:00" },
        { start: "11:00:00", end: "13:00:00" },
      ]),
    ).toMatch(/overlap/i);
  });

  it("detects slot overlap against any range", () => {
    const ranges = [
      { start: "08:00:00", end: "10:00:00" },
      { start: "16:00:00", end: "18:00:00" },
    ];
    expect(slotOverlapsAnyParkBlock("09:00:00", "09:30:00", ranges)).toBe(true);
    expect(slotOverlapsAnyParkBlock("12:00:00", "12:30:00", ranges)).toBe(false);
    expect(slotOverlapsAnyParkBlock("16:30:00", "17:00:00", ranges)).toBe(true);
  });

  it("builds save payload with legacy first window", () => {
    expect(
      parkDayFlagBlockPayload([
        { start: "16:00:00", end: "18:00:00" },
        { start: "08:00:00", end: "10:00:00" },
      ]),
    ).toEqual({
      block_ranges: [
        { start: "08:00:00", end: "10:00:00" },
        { start: "16:00:00", end: "18:00:00" },
      ],
      block_start: "08:00:00",
      block_end: "10:00:00",
    });
  });
});
