import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/lib/queryKeys";
import type { StageStatus } from "@/hooks/useProcessStages";

export interface StageSummary {
  total: number;
  completed: number;
  inProgress: string[];
  /** 0–100 */
  percent: number;
}

export const EMPTY_SUMMARY: StageSummary = { total: 0, completed: 0, inProgress: [], percent: 0 };

export type StageSummaryMap = Record<string, StageSummary>;

/** Resumen de avance por proceso, calculado desde process_stages (RLS filtra por tenant). */
export function useProcessStageSummaries() {
  return useQuery({
    queryKey: queryKeys.processStageSummaries(),
    queryFn: async (): Promise<StageSummaryMap> => {
      const { data, error } = await supabase
        .from("process_stages")
        .select("process_id, name, status, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);

      const map: StageSummaryMap = {};
      for (const row of data ?? []) {
        const s = (map[row.process_id] ??= { total: 0, completed: 0, inProgress: [], percent: 0 });
        s.total += 1;
        const status = (row.status as StageStatus) ?? "not_started";
        if (status === "completed") s.completed += 1;
        if (status === "in_progress") s.inProgress.push(row.name);
      }
      for (const s of Object.values(map)) {
        s.percent = s.total ? Math.round((s.completed / s.total) * 100) : 0;
      }
      return map;
    },
  });
}
