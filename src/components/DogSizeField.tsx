import { Label } from "@/components/ui/label";
import {
  DOG_SIZE_FORM_OPTIONS,
  GROOMING_DOG_SIZE_FORM_OPTIONS,
  type DogSizeFormValue,
  type GroomingDogSizeFormValue,
} from "@/lib/dogSizeForm";

export function DogSizeField<T extends string = DogSizeFormValue>({
  value,
  onChange,
  name,
  label = "Dog size",
  options = DOG_SIZE_FORM_OPTIONS as readonly T[],
}: {
  value: T | null;
  onChange: (v: T) => void;
  /** Unique `name` for the radio group (required when multiple groups exist on one page). */
  name: string;
  label?: string;
  options?: readonly T[];
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((opt) => (
          <label
            key={opt}
            className="flex cursor-pointer items-center gap-2 text-sm font-normal"
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4 accent-primary"
            />
            {opt}
          </label>
        ))}
      </div>
    </div>
  );
}

/** Grooming intake — Little Gems only accepts small and medium dogs. */
export function GroomingDogSizeField({
  value,
  onChange,
  name,
  label = "Dog size",
}: {
  value: GroomingDogSizeFormValue | null;
  onChange: (v: GroomingDogSizeFormValue) => void;
  name: string;
  label?: string;
}) {
  return (
    <DogSizeField
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      options={GROOMING_DOG_SIZE_FORM_OPTIONS}
    />
  );
}
