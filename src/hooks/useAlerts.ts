import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Alert } from "@/types/process";
import { queryKeys } from "@/lib/queryKeys";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { humanizeTechnicalText } from "@/lib/stageLabels";

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
        .select("id, process_id, type, severity, message, due_date, resolved, created_at, read_at");
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as Alert[];
      return [...rows].sort((a, b) => {
        if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
        const sev = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
        if (sev !== 0) return sev;
        return (b.created_at ?? "").localeCompare(a.created_at ?? "");
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

/** Marca una alerta individual como leída. */
export function useMarkAlertRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ read_at: new Date().toISOString() } as never)
        .eq("id", alertId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts() }),
  });
}

/** Marca todas las alertas pendientes no leídas del tenant como leídas. */
export function useMarkAllAlertsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("alerts")
        .update({ read_at: new Date().toISOString() } as never)
        .is("read_at", null)
        .eq("resolved", false);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alerts() }),
  });
}

/** Suscripción Realtime a nuevas alertas del tenant actual. */
export function useAlertsRealtime() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const tenantId = user?.tenantId ?? null;

  useEffect(() => {
    if (!tenantId) return;
    const channel = supabase
      .channel(`alerts-${tenantId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerts", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          qc.invalidateQueries({ queryKey: queryKeys.alerts() });
          const msg = humanizeTechnicalText((payload.new as { message?: string })?.message ?? "");
          if (msg) {
            toast.warning(`🔔 Nueva alerta: ${msg.length > 90 ? `${msg.slice(0, 90)}…` : msg}`);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerts", filter: `tenant_id=eq.${tenantId}` },
        () => qc.invalidateQueries({ queryKey: queryKeys.alerts() }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, tenantId]);
}
