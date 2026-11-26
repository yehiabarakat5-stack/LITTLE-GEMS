import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { VISIT_REQUEST_POLL_MS } from "@/lib/visitRequestAlerts";

/** park_bookings.reviewed_* is newer than generated Database types. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type ClientAssessmentAlertRow = {
  id: string;
  branch_id: string;
  visit_date: string;
  slot_start: string;
  created_at: string;
  reviewed_at: string | null;
  owner_id: string | null;
  pet_id: string | null;
  owner_name_raw: string | null;
  pet_name_raw: string | null;
  owners: { first_name: string | null; last_name: string | null } | null;
  pets: { name: string | null } | null;
};

export function clientAssessmentContactName(row: ClientAssessmentAlertRow) {
  const fromOwner = [row.owners?.first_name, row.owners?.last_name].filter(Boolean).join(" ").trim();
  return fromOwner || row.owner_name_raw?.trim() || "Client";
}

export function clientAssessmentPetName(row: ClientAssessmentAlertRow) {
  return row.pets?.name?.trim() || row.pet_name_raw?.trim() || "Pet";
}

export function useUnhandledClientAssessments(branchId: string | null) {
  return useQuery({
    queryKey: ["client-assessment-alerts", branchId],
    enabled: !!branchId,
    queryFn: async (): Promise<ClientAssessmentAlertRow[]> => {
      const { data, error } = await db
        .from("park_bookings")
        .select(
          "id, branch_id, visit_date, slot_start, created_at, reviewed_at, owner_id, pet_id, owner_name_raw, pet_name_raw, owners(first_name, last_name), pets(name)",
        )
        .eq("branch_id", branchId)
        .eq("is_assessment", true)
        .is("booked_by_staff_id", null)
        .is("reviewed_at", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ClientAssessmentAlertRow[];
    },
    refetchInterval: VISIT_REQUEST_POLL_MS,
  });
}

export function useMarkClientAssessmentReviewed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; reviewed_by?: string | null }) => {
      const { error } = await db
        .from("park_bookings")
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: args.reviewed_by ?? null,
        })
        .eq("id", args.id)
        .is("reviewed_at", null);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-assessment-alerts"] });
      qc.invalidateQueries({ queryKey: ["park"] });
    },
  });
}
