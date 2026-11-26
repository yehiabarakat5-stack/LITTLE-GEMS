import { digitsOnlyPhone } from "@/lib/whatsappInvoiceReminder";

/** wa.me URL with UAE (+971) country code when missing. */
export function buildUaeWhatsAppUrl(phone: string | null | undefined): string | null {
  let digits = digitsOnlyPhone(phone);
  if (!digits) return null;

  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("971")) {
    return `https://wa.me/${digits}`;
  }
  if (digits.startsWith("0")) {
    return `https://wa.me/971${digits.slice(1)}`;
  }
  if (digits.length <= 9) {
    return `https://wa.me/971${digits}`;
  }
  return `https://wa.me/${digits}`;
}
