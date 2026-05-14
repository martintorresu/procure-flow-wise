import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { UserRole } from "@/types/pdc";

export type ConditionType = "amount" | "criticality" | "both";

export interface ApprovalRule {
  id: string;
  tenant_id: string;
  condition_type: ConditionType;
  amount_threshold: number | null;
  criticality_level: "baja" | "media" | "alta" | null;
  required_role: UserRole;
  stage: string;
  label: string;
  active: boolean;
}

export function useApprovalMatrix(): UseQueryResult<ApprovalRule[], Error> {
  return useQuery({
    queryKey: queryKeys.approvalMatrix(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_matrix")
        .select("id, tenant_id, condition_type, amount_threshold, criticality_level, required_role, stage, label, active")
        .order("stage");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ApprovalRule[];
    },
  });
}

export function useUpdateApprovalRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      rule: Pick<ApprovalRule, "id" | "amount_threshold" | "required_role" | "active">,
    ) => {
      const { error } = await supabase
        .from("approval_matrix")
        .update({
          amount_threshold: rule.amount_threshold,
          required_role: rule.required_role,
          active: rule.active,
        })
        .eq("id", rule.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.approvalMatrix() }),
  });
}

/** Aprueba un PdC en pending_approval: avanza a la etapa destino y resuelve la alerta. */
export function useApprovePdc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pdcId: string) => {
      const { data: pdc, error: pdcErr } = await supabase
        .from("purchase_processes")
        .select("id, approval_target_stage, approval_status")
        .eq("id", pdcId).single();
      if (pdcErr) throw new Error(pdcErr.message);
      if (pdc.approval_status !== "pending" || !pdc.approval_target_stage) {
        throw new Error("Este PdC no tiene una aprobación pendiente.");
      }

      const { error: upErr } = await supabase
        .from("purchase_processes")
        .update({
          current_stage: pdc.approval_target_stage as
            | "ingenieria" | "programacion" | "compras" | "licitacion"
            | "evaluacion" | "orden_compra" | "seguimiento" | "recepcion",
          approval_status: "approved",
          approval_required_role: null,
          approval_target_stage: null,
        })
        .eq("id", pdcId);
      if (upErr) throw new Error(upErr.message);

      await supabase
        .from("alerts")
        .update({ resolved: true })
        .eq("pdc_id", pdcId)
        .eq("type", "approval_required")
        .eq("resolved", false);
    },
    onSuccess: (_d, pdcId) => {
      qc.invalidateQueries({ queryKey: ["pdcs"] });
      qc.invalidateQueries({ queryKey: queryKeys.pdc(pdcId) });
      qc.invalidateQueries({ queryKey: queryKeys.alerts() });
    },
  });
}
