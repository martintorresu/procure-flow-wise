import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LogisticsEvent } from "@/types/pdc";
import { queryKeys } from "@/lib/queryKeys";

/** Eventos logísticos de un PdC (ex-work, embarque, arribo). RLS filtra por tenant_id. */
export function useLogisticsEvents(pdcId: string | undefined): UseQueryResult<LogisticsEvent[], Error> {
  return useQuery({
    queryKey: pdcId ? queryKeys.logisticsEvents(pdcId) : ["logistics_events", "none"],
    enabled: !!pdcId,
    queryFn: async (): Promise<LogisticsEvent[]> => {
      const { data, error } = await supabase
        .from("logistics_events")
        .select("id, pdc_id, exwork_date, shipped_date, chile_arrival_date, port_arrival_date, damages_reported")
        .eq("pdc_id", pdcId!)
        .order("exwork_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as LogisticsEvent[];
    },
  });
}
