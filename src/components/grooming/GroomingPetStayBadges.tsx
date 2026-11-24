import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatGroomingBoardingStayLine,
  formatGroomingDaycareStayLine,
  groomingPetIdentityLine,
  type GroomingPetStayFlag,
} from "@/lib/groomingPetStay";

export function GroomingPetPhoto({
  photoUrl,
  name,
  className,
}: {
  photoUrl?: string | null;
  name: string;
  className?: string;
}) {
  if (!photoUrl) return null;
  return (
    <img
      src={photoUrl}
      alt={name}
      className={cn("h-9 w-9 shrink-0 rounded-full object-cover border", className)}
    />
  );
}

export function GroomingPetIdentitySubline({
  breed,
  colour,
  ownerLastName,
  className,
}: {
  breed?: string | null;
  colour?: string | null;
  ownerLastName?: string | null;
  className?: string;
}) {
  const line = groomingPetIdentityLine({ breed, colour, ownerLastName });
  if (!line) return null;
  return <p className={cn("text-sm text-muted-foreground", className)}>{line}</p>;
}

export function GroomingPetStayBadges({
  stay,
  compact,
  className,
}: {
  stay?: GroomingPetStayFlag | null;
  compact?: boolean;
  className?: string;
}) {
  if (!stay?.boarding && !stay?.daycare) return null;

  if (compact) {
    return (
      <span className={cn("inline-flex flex-wrap gap-1", className)}>
        {stay.boarding ? (
          <Badge
            variant="outline"
            className="border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100 text-[10px] font-medium"
          >
            🏨{stay.boarding.roomLabel ? ` ${stay.boarding.roomLabel}` : " Boarding"}
          </Badge>
        ) : null}
        {stay.daycare ? (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 text-[10px] font-medium"
          >
            ☀️ Daycare
          </Badge>
        ) : null}
      </span>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {stay.boarding ? (
        <Badge
          variant="outline"
          className="w-fit border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100 font-medium"
        >
          {formatGroomingBoardingStayLine(stay.boarding)}
        </Badge>
      ) : null}
      {stay.daycare ? (
        <Badge
          variant="outline"
          className="w-fit border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100 font-medium"
        >
          {formatGroomingDaycareStayLine(stay.daycare)}
        </Badge>
      ) : null}
    </div>
  );
}
