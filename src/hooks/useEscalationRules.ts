import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EscalationSeverity = "high" | "critical";

export interface EscalationRule {
  id: string;
  tenant_id: string;
  severity: EscalationSeverity;
  escalation_hours: number;
  re_notify_assignee: boolean;
  notify_manager: boolean;
  active: boolean;
}

export const escalationRulesKey = () => ["escalation_rules"] as const;

export function useEscalationRules(): UseQueryResult<EscalationRule[], Error> {
  return useQuery({
    queryKey: escalationRulesKey(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("escalation_rules")
        .select("id, tenant_id, severity, escalation_hours, re_notify_assignee, notify_manager, active")
        .order("severity", { ascending: true });
      if (error) throw error;
      return (data ?? []) as EscalationRule[];
    },
  });
}

export function useUpsertEscalationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rule: Partial<EscalationRule> & { id: string }) => {
      const { id, ...fields } = rule;
      const { error } = await supabase.from("escalation_rules").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: escalationRulesKey() });
    },
  });
}
