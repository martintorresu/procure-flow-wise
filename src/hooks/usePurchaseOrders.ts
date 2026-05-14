import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PurchaseOrder } from "@/types/pdc";

/** Órdenes de compra de un PdC. RLS filtra por tenant_id. */
export function usePurchaseOrders(pdcId: string | undefined): UseQueryResult<PurchaseOrder[], Error> {
  return useQuery({
    queryKey: ["purchase_orders", pdcId],
    enabled: !!pdcId,
    queryFn: async (): Promise<PurchaseOrder[]> => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, pdc_id, po_number, issue_date, accepted_date, amount")
        .eq("pdc_id", pdcId!)
        .order("issue_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PurchaseOrder[];
    },
  });
}
