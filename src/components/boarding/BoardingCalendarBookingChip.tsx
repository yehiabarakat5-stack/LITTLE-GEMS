import { useState } from "react";
import { Loader2, Luggage, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import type { BookingWithDetails } from "@/hooks/useBookings";
import { useUpdateBooking } from "@/hooks/useBookings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  boardingCalendarChipStyle,
  boardingStatusButtonStyle,
  resolveBoardingCalendarStatusKey,
  type BoardingCalendarStatusColors,
} from "@/lib/boardingCalendarStatusColors";
import { isImportPlaceholderBooking } from "@/lib/boardingUnknownKennel";
import { bookingAnyPetHasAlerts } from "@/lib/petAlerts";
import { bookingBelongingsCount } from "@/lib/bookingUtils";
import { extractErrorMessage } from "@/lib/errors";

type Props = {
  booking: BookingWithDetails;
  label: string;
  span: number;
  dayColWidth: number;
  statusColors: BoardingCalendarStatusColors;
  isPlaceholder?: boolean;
  onOpen: () => void;
  onCancelled?: () => void;
};

export function BoardingCalendarBookingChip({
  booking,
  label,
  span,
  dayColWidth,
  statusColors,
  isPlaceholder,
  onOpen,
  onCancelled,
}: Props) {
  const updateBooking = useUpdateBooking();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const chipPlaceholder = isPlaceholder || isImportPlaceholderBooking(booking);
  const statusKey = resolveBoardingCalendarStatusKey({
    status: booking.status,
    bookingItemsCount: booking.booking_items?.[0]?.count,
    isImportPlaceholder: chipPlaceholder,
  });
  const chipStyle = boardingCalendarChipStyle(statusColors, statusKey);
  const inlineStyle = boardingStatusButtonStyle(chipStyle, hovered);

  const handleCancel = () => {
    updateBooking.mutate(
      { id: booking.id, status: "cancelled" },
      {
        onSuccess: () => {
          toast.success("Booking cancelled");
          setConfirmOpen(false);
          onCancelled?.();
        },
        onError: (err) => toast.error(extractErrorMessage(err)),
      },
    );
  };

  return (
    <>
      <div
        style={{
          minWidth: dayColWidth * span - 4,
          width: dayColWidth * span - 4,
          marginLeft: 2,
          marginRight: 2,
          ...inlineStyle,
        }}
        className="group relative h-10 mt-1 rounded text-xs font-medium px-2 flex items-center gap-1
          cursor-pointer truncate z-10 select-none border border-dashed"
        onClick={onOpen}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <span className="truncate min-w-0 flex-1 pr-4">{label || booking.booking_ref || "—"}</span>
        {bookingAnyPetHasAlerts(booking) ? (
          <TriangleAlert
            className="h-3.5 w-3.5 shrink-0 opacity-90 drop-shadow-sm"
            aria-label="Pet alert"
          />
        ) : null}
        {booking.booking_pets.length > 1 ? (
          <span className="shrink-0 opacity-80">+{booking.booking_pets.length - 1}</span>
        ) : null}
        {bookingBelongingsCount(booking) > 0 ? (
          <Luggage className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
        ) : null}
        <button
          type="button"
          aria-label="Cancel booking"
          title="Cancel booking"
          className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded bg-black/25 text-white opacity-70 hover:bg-black/45 hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmOpen(true);
          }}
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              {booking.booking_ref ? `${booking.booking_ref} will be removed from the calendar.` : "This booking will be removed from the calendar."}{" "}
              Payment records are not deleted, but the stay will be marked cancelled. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateBooking.isPending}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={updateBooking.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
            >
              {updateBooking.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                "Cancel booking"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
