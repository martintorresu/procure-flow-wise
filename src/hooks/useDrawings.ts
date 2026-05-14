import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Drawing } from "@/types/pdc";

/** Planos asociados a un PdC. RLS filtra por tenant_id. */
export function useDrawings(pdcId: string | undefined): UseQueryResult<Drawing[], Error> {
  return useQuery({
    queryKey: ["drawings", pdcId],
    enabled: !!pdcId,
    queryFn: async (): Promise<Drawing[]> => {
      const { data, error } = await supabase
        .from("drawings")
        .select("id, pdc_id, requested_date, received_date, approved")
        .eq("pdc_id", pdcId!)
        .order("requested_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Drawing[];
    },
  });
}
