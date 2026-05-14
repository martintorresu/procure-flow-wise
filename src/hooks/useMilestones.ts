import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PdcMilestone } from "@/types/pdc";

/** Hitos de planificación de un PdC. RLS filtra por tenant_id. */
export function useMilestones(pdcId: string | undefined): UseQueryResult<PdcMilestone[], Error> {
  return useQuery({
    queryKey: ["milestones", pdcId],
    enabled: !!pdcId,
    queryFn: async (): Promise<PdcMilestone[]> => {
      const { data, error } = await supabase
        .from("purchase_milestones")
        .select("id, pdc_id, milestone_type, planned_date, actual_date, deviation_days, status")
        .eq("pdc_id", pdcId!)
        .order("planned_date", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PdcMilestone[];
    },
  });
}
