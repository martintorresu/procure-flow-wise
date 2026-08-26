import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { ContingencyMode, ContingencyStatus } from "@/lib/contingencies";
import { CRIT_FE_TO_DB } from "@/hooks/usePdcs";
import type { Criticality } from "@/types/pdc";

export interface ProcessRef {
  id: string;
  pdc_number: string;
  name: string;
  project: string;
  current_stage: string;
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
  parent:purchase_processes!process_contingencies_parent_process_id_fkey(id, pdc_number, name, project, current_stage),
  child:purchase_processes!process_contingencies_child_process_id_fkey(id, pdc_number, name, project, current_stage)
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
  qc.invalidateQueries({ queryKey: ["pdcs"] });
  qc.invalidateQueries({ queryKey: queryKeys.alerts() });
}

export interface CreateContingencyInput {
  parentProcessId: string;
  executionMode: ContingencyMode;
  reason: string;
  title: string;
  criticality: Criticality;
  project: string;
  projectId: string | null;
  createdBy: string;
}

/** Crea el proceso hijo, la bifurcación, la alerta y pausa el padre si aplica. */
export function useCreateContingency() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateContingencyInput) => {
      const { data: parent, error: parentErr } = await supabase
        .from("purchase_processes")
        .select("id, name, tenant_id, currency, required_on_site_date, requesting_area")
        .eq("id", input.parentProcessId)
        .single();
      if (parentErr) throw new Error(parentErr.message);

      // 1. Proceso hijo (hereda criticidad y proyecto del padre).
      const { data: child, error: childErr } = await supabase
        .from("purchase_processes")
        .insert({
          name: input.title,
          project: input.project,
          project_id: input.projectId,
          process_type: "personalizado",
          predecessor_process_id: input.parentProcessId,
          description: `Contingencia del proceso ${parent.name}: ${input.reason}`,
          criticality: CRIT_FE_TO_DB[input.criticality],
          currency: parent.currency ?? "USD",
          required_on_site_date: parent.required_on_site_date,
          requesting_area: parent.requesting_area || "Sin especificar",
          created_by: input.createdBy,
          tenant_id: parent.tenant_id, // reforzado por trigger/RLS
        })
        .select("id, pdc_number, name")
        .single();
      if (childErr) throw new Error(childErr.message);

      // 2. Bifurcación
      const { data: contingency, error: contErr } = await supabase
        .from("process_contingencies")
        .insert({
          parent_process_id: input.parentProcessId,
          child_process_id: child.id,
          execution_mode: input.executionMode,
          reason: input.reason,
          created_by: input.createdBy,
          tenant_id: parent.tenant_id, // reforzado por trigger/RLS
        })
        .select("id")
        .single();
      if (contErr) throw new Error(contErr.message);

      // 3. Pausa del padre en Modo A
      if (input.executionMode === "pause_and_attend") {
        const { error: pauseErr } = await supabase
          .from("purchase_processes")
          .update({ paused_by_contingency: contingency.id })
          .eq("id", input.parentProcessId);
        if (pauseErr) throw new Error(pauseErr.message);
      }

      // 4. Alerta in-app
      await supabase.from("alerts").insert({
        pdc_id: input.parentProcessId,
        type: "contingency",
        severity: input.executionMode === "pause_and_attend" ? "high" : "medium",
        message:
          input.executionMode === "pause_and_attend"
            ? `⏸️ El proceso ${parent.name} ha sido pausado por contingencia: ${input.reason}`
            : `🔀 Se ha creado una contingencia en paralelo para ${parent.name}: ${input.reason}`,
        created_by: input.createdBy,
        tenant_id: parent.tenant_id,
      });

      return { contingencyId: contingency.id, childProcessId: child.id, childNumber: child.pdc_number };
    },
    onSuccess: () => invalidate(qc),
  });
}

async function closeContingency(id: string, status: "completed" | "cancelled") {
  const { data: cont, error } = await supabase
    .from("process_contingencies")
    .select("id, parent_process_id, execution_mode, tenant_id, parent:purchase_processes!process_contingencies_parent_process_id_fkey(name)")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);

  const { error: updErr } = await supabase
    .from("process_contingencies")
    .update({ status, completed_at: new Date().toISOString() })
    .eq("id", id);
  if (updErr) throw new Error(updErr.message);

  if (cont.execution_mode === "pause_and_attend") {
    const { error: resumeErr } = await supabase
      .from("purchase_processes")
      .update({ paused_by_contingency: null })
      .eq("id", cont.parent_process_id);
    if (resumeErr) throw new Error(resumeErr.message);

    if (status === "completed") {
      const parentName = (cont as unknown as { parent?: { name?: string } }).parent?.name ?? "padre";
      await supabase.from("alerts").insert({
        pdc_id: cont.parent_process_id,
        type: "contingency",
        severity: "low",
        message: `▶️ El proceso ${parentName} se ha reanudado tras completar la contingencia.`,
        tenant_id: cont.tenant_id,
      });
    }
  }
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
