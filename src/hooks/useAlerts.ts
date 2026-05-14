import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Alert } from "@/types/pdc";
import { queryKeys } from "@/lib/queryKeys";

const SEVERITY_ORDER: Record<Alert["severity"], number> = {
  critical: 0, high: 1, medium: 2, low: 3,
};

/** Lista todas las alertas del tenant del usuario (RLS filtra por tenant_id en BD). */
export function useAlerts(): UseQueryResult<Alert[], Error> {
  return useQuery({
    queryKey: queryKeys.alerts(),
    queryFn: async (): Promise<Alert[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, pdc_id, type, severity, message, due_date, resolved, created_at");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Alert[];
      return [...rows].sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
      });
    },
  });
}

/** Marca una alerta como resuelta e invalida la cache. */
export function useResolveAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ resolved: true })
        .eq("id", alertId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.alerts() });
    },
  });
}
