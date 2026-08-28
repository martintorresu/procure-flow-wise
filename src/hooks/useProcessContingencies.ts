import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { ContingencyMode, ContingencyStatus } from "@/lib/contingencies";

export interface ProcessRef {
  id: string;
  process_number: string;
  name: string;
  project_id: string | null;
}

export interface Contingency {
  id: string;
  tenant_id: string;
  parent_process_id: string;
  child_process_id: string;
  execution_mode: ContingencyMode;
  reason: string;
  status: ContingencyStatus;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  parent?: ProcessRef | null;
  child?: ProcessRef | null;
}

const SELECT = `
  id, tenant_id, parent_process_id, child_process_id, execution_mode, reason,
  status, created_by, created_at, completed_at,
  parent:processes!process_contingencies_parent_process_id_fkey(id, process_number, name, project_id),
  child:processes!process_contingencies_child_process_id_fkey(id, process_number, name, project_id)
`;

/** Contingencias donde el proceso participa como padre o como hijo. */
export function useContingenciesByProcess(processId?: string): UseQueryResult<Contingency[], Error> {
  return useQuery({
    queryKey: queryKeys.contingenciesByProcess(processId ?? "none"),
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_contingencies")
        .select(SELECT)
        .or(`parent_process_id.eq.${processId},child_process_id.eq.${processId}`)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Contingency[];
    },
  });
}

/** Todas las contingencias del tenant (RLS filtra). */
export function useAllContingencies(): UseQueryResult<Contingency[], Error> {
  return useQuery({
    queryKey: queryKeys.contingencies(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_contingencies")
        .select(SELECT)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Contingency[];
    },
  });
}

/** Solo las contingencias activas del tenant (dashboard). */
export function useActiveContingencies(): UseQueryResult<Contingency[], Error> {
  const all = useAllContingencies();
  return {
    ...all,
    data: all.data?.filter((c) => c.status === "active"),
  } as UseQueryResult<Contingency[], Error>;
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["contingencies"] });
  qc.invalidateQueries({ queryKey: ["processes"] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts() });
}

export interface CreateContingencyInput {
  parentProcessId: string;
  executionMode: ContingencyMode;
  reason: string;
  title: string;
  createdBy: string;
}

/** Crea el proceso hijo, la bifurcación, la alerta y pausa el padre de forma atómica (RPC). */
export function useCreateContingency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateContingencyInput) => {
      const { data, error } = await supabase.rpc("create_contingency", {
        p_parent_process_id: input.parentProcessId,
        p_execution_mode: input.executionMode,
        p_reason: input.reason,
        p_child_name: input.title,
      });
      if (error) throw new Error(error.message);
      const res = data as unknown as {
        contingency_id: string;
        child_process_id: string;
        child_number: string;
      };
      return {
        contingencyId: res.contingency_id,
        childProcessId: res.child_process_id,
        childNumber: res.child_number,
      };
    },
    onSuccess: () => invalidate(qc),
  });
}

/** El trigger de BD despausa el padre y crea la alerta de reanudación. */
async function closeContingency(id: string, status: "completed" | "cancelled") {
  const { error } = await supabase
    .from("process_contingencies")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Marca la contingencia como completada y reanuda el padre si estaba pausado. */
export function useCompleteContingency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeContingency(id, "completed"),
    onSuccess: () => invalidate(qc),
  });
}

/** Cancela la contingencia y reanuda el padre si estaba pausado. */
export function useCancelContingency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => closeContingency(id, "cancelled"),
    onSuccess: () => invalidate(qc),
  });
}

