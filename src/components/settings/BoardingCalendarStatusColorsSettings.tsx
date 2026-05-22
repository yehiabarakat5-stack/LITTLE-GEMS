import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BOARDING_CALENDAR_STATUS_KEYS,
  BOARDING_CALENDAR_STATUS_LABELS,
  type BoardingCalendarStatusColors,
} from "@/lib/boardingCalendarStatusColors";
import {
  DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  useBoardingStatusColors,
  useSaveBoardingStatusColors,
} from "@/hooks/useBoardingStatusColors";

export function BoardingCalendarStatusColorsSettings() {
  const { data, isLoading, isError, error } = useBoardingStatusColors();
  const save = useSaveBoardingStatusColors();
  const [colors, setColors] = useState<BoardingCalendarStatusColors>(
    DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  );
  const [original, setOriginal] = useState<BoardingCalendarStatusColors>(
    DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  );

  useEffect(() => {
    if (!data) return;
    setColors(data);
    setOriginal(data);
  }, [data]);

  const isDirty = useMemo(
    () => BOARDING_CALENDAR_STATUS_KEYS.some((key) => colors[key] !== original[key]),
    [colors, original],
  );

  const handleSave = () => {
    save.mutate(colors, {
      onSuccess: (saved) => {
        setOriginal(saved);
        toast.success("Boarding calendar colors saved");
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Save failed");
      },
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Boarding calendar status colors</h2>
      <p className="text-sm text-muted-foreground">
        Customize the colors used on booking cards in the boarding calendar. Changes apply immediately
        after saving.
      </p>

      {isError ? (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load color settings."}
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {BOARDING_CALENDAR_STATUS_KEYS.map((key) => (
            <div
              key={key}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <Label htmlFor={`boarding-color-${key}`} className="text-sm font-medium">
                {BOARDING_CALENDAR_STATUS_LABELS[key]}
              </Label>
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 shrink-0 rounded border border-border"
                  style={{ backgroundColor: colors[key] }}
                  aria-hidden
                />
                <Input
                  id={`boarding-color-${key}`}
                  type="color"
                  value={colors[key]}
                  onChange={(e) =>
                    setColors((prev) => ({
                      ...prev,
                      [key]: e.target.value.toUpperCase(),
                    }))
                  }
                  className="h-9 w-14 cursor-pointer p-1"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          {isDirty ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Unsaved changes
            </span>
          ) : null}
        </div>
        <Button
          type="button"
          onClick={handleSave}
          disabled={!isDirty || save.isPending || isLoading}
        >
          {save.isPending ? "Saving..." : "Save colors"}
        </Button>
      </div>
    </div>
  );
}
