/**
 * Coro brand display names (client-facing + staff UI).
 *
 * LEGAL invoice/receipt headers stay in PrintCompanyHeader.branchCompanyName —
 * do not use these for tax invoices, credit/debit notes that must match the
 * trade licence, or invoice number prefixes (those use branches.short_name MSH/LG).
 */

export type BranchCode = "main" | "little_gems" | string;

export const CORO_GROUP_NAME = "Coro";

/** Full campus name for a branch (branch switcher, forms, reports). */
export function brandCampusName(branchCode: BranchCode | null | undefined): string {
  if (branchCode === "little_gems") return "Coro Campus Little Gems";
  return "Coro Campus Flagship";
}

/** Short pill / badge label. */
export function brandShortLabel(branchCode: BranchCode | null | undefined): string {
  if (branchCode === "little_gems") return "Little Gems";
  return "Flagship";
}

/** Map transport / inbox branch tags (MSH|LG|main|little_gems|…) to short display. */
export function brandShortFromTag(tag: string | null | undefined): string | null {
  const text = String(tag ?? "").trim();
  if (!text) return null;
  if (/lg|gems|little/i.test(text)) return "Little Gems";
  if (/msh|main|flagship/i.test(text)) return "Flagship";
  return null;
}

/** Feeding form / daily-report image brand strip. */
export function brandFormStrip(branchCode: BranchCode | null | undefined): {
  name: string;
  accent: string;
  soft: string;
} {
  return branchCode === "little_gems"
    ? { name: brandCampusName("little_gems"), accent: "#be185d", soft: "#fce7f3" }
    : { name: brandCampusName("main"), accent: "#b45309", soft: "#fef3c7" };
}

/** Onboarding /join business.name (by branch code). */
export function brandBusinessName(branchCode: BranchCode | null | undefined): string {
  return brandCampusName(branchCode);
}
