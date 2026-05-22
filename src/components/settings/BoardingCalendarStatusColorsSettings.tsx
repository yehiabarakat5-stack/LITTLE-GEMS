import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { extractErrorMessage } from "@/lib/errors";
import {
  BOARDING_CALENDAR_STATUS_KEYS,
  BOARDING_CALENDAR_STATUS_LABELS,
  BOARDING_STATUS_COLOR_FIELDS,
  DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  statusColorsEqual,
  type BoardingCalendarStatusColors,
  type BoardingCalendarStatusKey,
  type BoardingStatusColorField,
} from "@/lib/boardingCalendarStatusColors";
import {
  useBoardingStatusColors,
  useSaveBoardingStatusColors,
} from "@/hooks/useBoardingStatusColors";

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 w-14 cursor-pointer p-1"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="h-9 font-mono text-xs"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function StatusPreviewChip({
  label,
  style,
}: {
  label: string;
  style: BoardingCalendarStatusColors[BoardingCalendarStatusKey];
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="inline-flex h-9 min-w-[8rem] items-center justify-center rounded border border-dashed px-3 text-xs font-medium"
      style={{
        backgroundColor: hovered ? style.hover : style.background,
        color: style.text,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </div>
  );
}

export function BoardingCalendarStatusColorsSettings() {
  const { data, isLoading, isError, error } = useBoardingStatusColors();
  const save = useSaveBoardingStatusColors();
  const [colors, setColors] = useState<BoardingCalendarStatusColors>(
    DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  );
  const [original, setOriginal] = useState<BoardingCalendarStatusColors>(
    DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  );
  const [previewKeys, setPreviewKeys] = useState<Set<BoardingCalendarStatusKey>>(new Set());

  useEffect(() => {
    if (!data) return;
    setColors(data);
    setOriginal(data);
  }, [data]);

  const isDirty = useMemo(() => !statusColorsEqual(colors, original), [colors, original]);

  const setColorField = (
    key: BoardingCalendarStatusKey,
    field: BoardingStatusColorField,
    value: string,
  ) => {
    setColors((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const togglePreview = (key: BoardingCalendarStatusKey) => {
    setPreviewKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleReset = () => {
    setColors(structuredClone(DEFAULT_BOARDING_CALENDAR_STATUS_COLORS));
  };

  const handleSave = () => {
    save.mutate(colors, {
      onSuccess: (saved) => {
        setOriginal(saved);
        toast.success("Boarding calendar colors saved");
      },
      onError: (err) => {
        toast.error(extractErrorMessage(err, "Save failed"));
      },
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">Boarding calendar status colors</h2>
        <p className="text-sm text-muted-foreground">
          Set background, text, and hover colors for calendar chips and booking detail action buttons.
          Saved to system settings and applied immediately after saving.
        </p>
      </div>

      {isError ? (
        <p className="text-sm text-destructive">
          {extractErrorMessage(error, "Could not load color settings.")}
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-4">
          {BOARDING_CALENDAR_STATUS_KEYS.map((key) => (
            <div key={key} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{BOARDING_CALENDAR_STATUS_LABELS[key]}</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => togglePreview(key)}
                >
                  {previewKeys.has(key) ? "Hide preview" : "Preview"}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {BOARDING_STATUS_COLOR_FIELDS.map((field) => (
                  <ColorField
                    key={field}
                    id={`boarding-color-${key}-${field}`}
                    label={field.charAt(0).toUpperCase() + field.slice(1)}
                    value={colors[key][field]}
                    onChange={(hex) => setColorField(key, field, hex)}
                  />
                ))}
              </div>
              {previewKeys.has(key) ? (
                <StatusPreviewChip label={BOARDING_CALENDAR_STATUS_LABELS[key]} style={colors[key]} />
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {isDirty ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Unsaved changes
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading}>
            Reset defaults
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || save.isPending || isLoading}
          >
            {save.isPending ? "Saving..." : "Save colors"}
          </Button>
        </div>
      </div>
    </div>
  );
}
