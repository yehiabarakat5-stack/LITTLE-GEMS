import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BOARDING_CALENDAR_STATUS_COLORS_KEY,
  DEFAULT_BOARDING_CALENDAR_STATUS_COLORS,
  parseBoardingCalendarStatusColors,
  serializeBoardingCalendarStatusColors,
  type BoardingCalendarStatusColors,
} from "@/lib/boardingCalendarStatusColors";

const queryKey = ["system_context", BOARDING_CALENDAR_STATUS_COLORS_KEY] as const;

export function useBoardingStatusColors() {
  return useQuery({
    queryKey,
    staleTime: 60_000,
    queryFn: async (): Promise<BoardingCalendarStatusColors> => {
      const { data, error } = await supabase
        .from("system_context")
        .select("content")
        .eq("key", BOARDING_CALENDAR_STATUS_COLORS_KEY)
        .maybeSingle();

      if (error) throw error;
      return parseBoardingCalendarStatusColors(data?.content);
    },
  });
}

export function useSaveBoardingStatusColors() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (colors: BoardingCalendarStatusColors) => {
      const content = serializeBoardingCalendarStatusColors(colors);
      const { error } = await supabase.from("system_context").upsert(
        {
          key: BOARDING_CALENDAR_STATUS_COLORS_KEY,
          content,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
      if (error) throw error;
      return parseBoardingCalendarStatusColors(content);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(queryKey, saved);
    },
  });
}

export { DEFAULT_BOARDING_CALENDAR_STATUS_COLORS };
