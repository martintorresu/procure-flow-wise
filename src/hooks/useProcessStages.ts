import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type StageStatus = "not_started" | "in_progress" | "blocked" | "completed";

export interface StageActivities {
  milestones: string[];
  checkpoints: string[];
  tasks: string[];
}

export interface ProcessStage {
  id: string;
  process_id: string;
  name: string;
  description: string | null;
  activities: StageActivities;
  sort_order: number;
  status: StageStatus;
  /** Línea base planificada y ejecución real (todas opcionales). */
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  responsible_name: string | null;
  external_entity: string | null;
}

const STAGE_COLUMNS =
  "id, process_id, name, description, activities, sort_order, status, planned_start, planned_end, actual_start, actual_end, responsible_name, external_entity";

const EMPTY: StageActivities = { milestones: [], checkpoints: [], tasks: [] };

function toActivities(raw: unknown): StageActivities {
  const a = (raw ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  return {
    milestones: arr(a.milestones),
    checkpoints: arr(a.checkpoints),
    tasks: arr(a.tasks),
  };
}

function toStage(r: Record<string, unknown>): ProcessStage {
  const s = (v: unknown) => (typeof v === "string" && v ? v : null);
  return {
    id: r.id as string,
    process_id: r.process_id as string,
    name: r.name as string,
    description: s(r.description),
    sort_order: r.sort_order as number,
    status: ((r.status as StageStatus) ?? "not_started") as StageStatus,
    activities: r.activities ? toActivities(r.activities) : EMPTY,
    planned_start: s(r.planned_start),
    planned_end: s(r.planned_end),
    actual_start: s(r.actual_start),
    actual_end: s(r.actual_end),
    responsible_name: s(r.responsible_name),
    external_entity: s(r.external_entity),
  };
}

/** Etapas de un proceso ordenadas por sort_order. RLS filtra por tenant. */
export function useProcessStages(processId: string | undefined) {
  return useQuery({
    queryKey: ["process-stages", processId ?? ""],
    enabled: !!processId,
    queryFn: async (): Promise<ProcessStage[]> => {
      const { data, error } = await supabase
        .from("process_stages")
        .select(STAGE_COLUMNS)
        .eq("process_id", processId!)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => toStage(r as unknown as Record<string, unknown>));
    },
  });
}

/**
 * Etapas de varios procesos en una sola consulta, agrupadas por process_id
 * y ordenadas para selector (in_progress primero, luego sort_order).
 */
export function useProcessStagesByProcess(processIds: (string | null | undefined)[]) {
  const ids = Array.from(new Set(processIds.filter((v): v is string => !!v))).sort();
  return useQuery({
    queryKey: ["process-stages-by-process", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<Map<string, ProcessStage[]>> => {
      const { data, error } = await supabase
        .from("process_stages")
        .select(STAGE_COLUMNS)
        .in("process_id", ids);
      if (error) throw new Error(error.message);
      const map = new Map<string, ProcessStage[]>();
      for (const r of data ?? []) {
        const stage = toStage(r as unknown as Record<string, unknown>);
        const list = map.get(stage.process_id);
        if (list) list.push(stage);
        else map.set(stage.process_id, [stage]);
      }
      for (const [k, v] of map) map.set(k, sortStagesForPicker(v));
      return map;
    },
  });
}

export const STAGE_STATUS_META: Record<StageStatus, { label: string; badge: string; dot: string }> = {
  not_started: {
    label: "No iniciada",
    badge: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground",
  },
  in_progress: {
    label: "En curso",
    badge: "bg-info/15 text-info border-info/40",
    dot: "bg-info",
  },
  blocked: {
    label: "Bloqueada",
    badge: "bg-warning/15 text-warning border-warning/40",
    dot: "bg-warning",
  },
  completed: {
    label: "Completada",
    badge: "bg-success/15 text-success border-success/40",
    dot: "bg-success",
  },
};

/** Etapas en curso primero, luego el resto por sort_order (para selectores). */
export function sortStagesForPicker(stages: ProcessStage[]): ProcessStage[] {
  return [...stages].sort((a, b) => {
    const ai = a.status === "in_progress" ? 0 : 1;
    const bi = b.status === "in_progress" ? 0 : 1;
    return ai !== bi ? ai - bi : a.sort_order - b.sort_order;
  });
}

/** Cambia el estado de una etapa. Permite múltiples etapas en curso simultáneamente. */
export function useUpdateStageStatus(processId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stageId,
      status,
      actual_start,
      actual_end,
    }: {
      stageId: string;
      status: StageStatus;
      actual_start?: string | null;
      actual_end?: string | null;
    }) => {
      const patch: { status: StageStatus; actual_start?: string | null; actual_end?: string | null } = { status };
      if (actual_start !== undefined) patch.actual_start = actual_start;
      if (actual_end !== undefined) patch.actual_end = actual_end;
      const { error } = await supabase
        .from("process_stages")
        .update(patch)
        .eq("id", stageId);
      if (error) throw new Error(error.message);
      return { stageId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-stages", processId ?? ""] });
      queryClient.invalidateQueries({ queryKey: ["process-stage-summaries"] });
      toast.success("Estado de la etapa actualizado");
    },
    onError: (e: Error) => toast.error(`No se pudo actualizar la etapa: ${e.message}`),
  });
}

export interface StagePlanPatch {
  planned_start?: string | null;
  planned_end?: string | null;
  actual_start?: string | null;
  actual_end?: string | null;
  responsible_name?: string | null;
  external_entity?: string | null;
}

/** Guarda la línea base (fechas plan/real) y el responsable u organismo externo de una etapa. */
export function useUpdateStagePlan(processId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ stageId, patch }: { stageId: string; patch: StagePlanPatch }) => {
      const { error } = await supabase.from("process_stages").update(patch).eq("id", stageId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-stages", processId ?? ""] });
      queryClient.invalidateQueries({ queryKey: ["process-stage-summaries"] });
      toast.success("Datos de la etapa guardados");
    },
    onError: (e: Error) => toast.error(`No se pudo guardar la etapa: ${e.message}`),
  });
}
