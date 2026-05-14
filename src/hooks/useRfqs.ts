import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Rfq, RfqSupplier } from "@/types/pdc";
import { queryKeys } from "@/lib/queryKeys";

export interface RfqsResult {
  rfqs: Rfq[];
  suppliers: RfqSupplier[];
}

/** RFQs de un PdC + sus suppliers asociados. RLS filtra por tenant_id. */
export function useRfqs(pdcId: string | undefined): UseQueryResult<RfqsResult, Error> {
  return useQuery({
    queryKey: pdcId ? queryKeys.rfqs(pdcId) : ["rfqs", "none"],
    enabled: !!pdcId,
    queryFn: async (): Promise<RfqsResult> => {
      const { data: rfqs, error: rfqErr } = await supabase
        .from("rfqs")
        .select("id, pdc_id, sent_date, close_date")
        .eq("pdc_id", pdcId!)
        .order("sent_date", { ascending: false });
      if (rfqErr) throw new Error(rfqErr.message);

      const rfqList = (rfqs ?? []) as unknown as Rfq[];
      if (rfqList.length === 0) return { rfqs: [], suppliers: [] };

      const { data: suppliers, error: supErr } = await supabase
        .from("rfq_suppliers")
        .select("id, rfq_id, supplier_name, quoted_amount, lead_time_days, technical_score, commercial_score, total_score")
        .in("rfq_id", rfqList.map((r) => r.id));
      if (supErr) throw new Error(supErr.message);

      return { rfqs: rfqList, suppliers: (suppliers ?? []) as unknown as RfqSupplier[] };
    },
  });
}
