import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FatEvent } from "@/types/pdc";

/** Eventos FAT (Factory Acceptance Test) de un PdC. RLS filtra por tenant_id. */
export function useFatEvents(pdcId: string | undefined): UseQueryResult<FatEvent[], Error> {
  return useQuery({
    queryKey: ["fat_events", pdcId],
    enabled: !!pdcId,
    queryFn: async (): Promise<FatEvent[]> => {
      const { data, error } = await supabase
        .from("fat_events")
        .select("id, pdc_id, scheduled_date, executed_date, result, report_received")
        .eq("pdc_id", pdcId!)
        .order("scheduled_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as FatEvent[];
    },
  });
}
