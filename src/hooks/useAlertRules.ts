import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertTriggerType =
  | "et_incomplete" | "rfq_overdue" | "po_unaccepted"
  | "fat_unscheduled" | "shipping_delayed" | "arrival_overdue" | "damage_reported"
  | "commitment_overdue" | "permit_expiring" | "stage_stalled" | "contingency_open";

export interface AlertRule {
  id: string;
  tenant_id: string;
  trigger_type: AlertTriggerType;
  threshold_days: number;
  severity: AlertSeverity;
  active: boolean;
  label: string;
}

export const TRIGGER_DESCRIPTIONS: Record<AlertTriggerType, string> = {
  et_incomplete: "ET sin completar más de N días desde su creación.",
  rfq_overdue: "RFQ con fecha de cierre vencida hace N días.",
  po_unaccepted: "OC emitida sin aceptación del proveedor por N días.",
  fat_unscheduled: "FAT sin agendar a N días de la fecha requerida.",
  shipping_delayed: "Despacho sin embarque tras N días desde el plan.",
  arrival_overdue: "Arribo posterior a la fecha planificada por N días.",
  damage_reported: "Daños reportados en recepción (umbral inmediato).",
  commitment_overdue: "Compromiso con fecha de entrega vencida hace N días y aún no completado.",
  permit_expiring: "Permiso próximo a vencer dentro de N días.",
  stage_stalled: "Etapa en curso sin cambios durante N días.",
  contingency_open: "Contingencia activa sin cerrar hace N días.",
};


export function useAlertRules(): UseQueryResult<AlertRule[], Error> {
  return useQuery({
    queryKey: queryKeys.alertRules(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alert_rules")
        .select("id, tenant_id, trigger_type, threshold_days, severity, active, label")
        .order("trigger_type");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AlertRule[];
    },
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Pick<AlertRule, "id" | "threshold_days" | "severity" | "active">) => {
      const { error } = await supabase
        .from("alert_rules")
        .update({
          threshold_days: rule.threshold_days,
          severity: rule.severity,
          active: rule.active,
        })
        .eq("id", rule.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.alertRules() }),
  });
}
