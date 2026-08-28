import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Pdc } from "@/types/pdc";
import { queryKeys, type PdcFilters } from "@/lib/queryKeys";
import type { ProcessType } from "@/lib/processTypes";

const SELECT = "*, project:projects(name)";

export interface PdcRow {
  id: string;
  pdc_number: string;
  name: string;
  description: string | null;
  responsible_name: string | null;
  process_type: string | null;
  project_id: string | null;
  project?: { name: string } | null;
  predecessor_process_id: string | null;
  paused_by_contingency: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  tenant_id?: string | null;
}

export function rowToPdc(r: PdcRow): Pdc {
  return {
    id: r.id,
    pdc_number: r.pdc_number,
    title: r.name,
    description: r.description ?? "",
    project_name: r.project?.name ?? "—",
    current_owner: r.responsible_name ?? "—",
    created_at: r.created_at,
    updated_at: r.updated_at,
    tenant_id: r.tenant_id ?? null,
    process_type: (r.process_type as Pdc["process_type"]) ?? "compra",
    project_id: r.project_id ?? null,
    predecessor_process_id: r.predecessor_process_id ?? null,
    paused_by_contingency: r.paused_by_contingency ?? null,
  };
}

/** Lista procesos del tenant del usuario (RLS filtra). Soporta filtros opcionales. */
export function usePdcs(filters?: PdcFilters): UseQueryResult<Pdc[], Error> {
  return useQuery({
    queryKey: queryKeys.pdcs(filters),
    queryFn: async () => {
      let q = supabase.from("purchase_processes").select(SELECT).order("created_at", { ascending: false });
      if (filters?.projectId) q = q.eq("project_id", filters.projectId);
      if (filters?.processType) q = q.eq("process_type", filters.processType);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as unknown as PdcRow[]).map(rowToPdc);
    },
  });
}

/** Detalle de un proceso. */
export function usePdc(id: string | undefined): UseQueryResult<Pdc | null, Error> {
  return useQuery({
    queryKey: id ? queryKeys.pdc(id) : ["pdcs", "none"],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_processes").select(SELECT).eq("id", id!).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? rowToPdc(data as unknown as PdcRow) : null;
    },
  });
}

export interface CreatePdcInput {
  project_id: string;
  process_type?: ProcessType;
  predecessor_process_id?: string | null;
  name: string;
  description?: string | null;
  responsible_name?: string | null;
  created_by: string;
}

export function useCreatePdc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePdcInput) => {
      const { data, error } = await supabase
        .from("purchase_processes")
        .insert({
          name: input.name,
          project_id: input.project_id,
          process_type: input.process_type ?? "compra",
          predecessor_process_id: input.predecessor_process_id ?? null,
          description: input.description ?? null,
          responsible_name: input.responsible_name ?? null,
          created_by: input.created_by,
          tenant_id: "00000000-0000-0000-0000-000000000000", // overridden by trigger
        })
        .select("id, pdc_number")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pdcs"] }),
  });
}

export interface UpdatePdcInput {
  id: string;
  patch: Partial<{
    name: string;
    project_id: string | null;
    process_type: ProcessType;
    description: string | null;
    responsible_name: string | null;
  }>;
}

export function useUpdatePdc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdatePdcInput) => {
      const { error } = await supabase
        .from("purchase_processes")
        .update(patch)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pdcs"] });
      qc.invalidateQueries({ queryKey: queryKeys.pdc(vars.id) });
    },
  });
}
