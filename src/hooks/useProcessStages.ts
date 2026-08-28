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
}

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

/** Etapas de un proceso ordenadas por sort_order. RLS filtra por tenant. */
export function useProcessStages(processId: string | undefined) {
  return useQuery({
    queryKey: ["process-stages", processId ?? ""],
    enabled: !!processId,
    queryFn: async (): Promise<ProcessStage[]> => {
      const { data, error } = await supabase
        .from("process_stages")
        .select("id, process_id, name, description, activities, sort_order, status")
        .eq("process_id", processId!)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        process_id: r.process_id,
        name: r.name,
        description: r.description,
        sort_order: r.sort_order,
        status: (r.status as StageStatus) ?? "not_started",
        activities: r.activities ? toActivities(r.activities) : EMPTY,
      }));
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
    mutationFn: async ({ stageId, status }: { stageId: string; status: StageStatus }) => {
      const { error } = await supabase
        .from("process_stages")
        .update({ status })
        .eq("id", stageId);
      if (error) throw new Error(error.message);
      return { stageId, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["process-stages", processId ?? ""] });
      toast.success("Estado de la etapa actualizado");
    },
    onError: (e: Error) => toast.error(`No se pudo actualizar la etapa: ${e.message}`),
  });
}
