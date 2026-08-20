import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Pdc, Criticality, PdcStatus } from "@/types/pdc";
import { queryKeys, type PdcFilters } from "@/lib/queryKeys";
import type { ProcessType } from "@/lib/processTypes";

// Mapas DB ↔ FE
const CRIT_DB_TO_FE: Record<string, Criticality> = { baja: "low", media: "medium", alta: "high" };
export const CRIT_FE_TO_DB: Record<Criticality, "baja" | "media" | "alta"> = {
  low: "baja", medium: "media", high: "alta",
};

const STAGE_TO_STATUS: Record<string, PdcStatus> = {
  ingenieria: "technical_definition",
  programacion: "planning",
  compras: "quotation",
  licitacion: "quotation",
  cotizacion: "quotation",
  evaluacion: "evaluation",
  adjudicacion: "awarded",
  orden_compra: "po_issued",
  oc: "po_issued",
  seguimiento: "fat",
  fat: "fat",
  logistica: "shipping",
  recepcion: "shipping",
  cerrado: "closed",
};

// Orden de avance de etapas en BD (process_stage enum)
const STAGE_ORDER = [
  "ingenieria", "programacion", "compras", "licitacion",
  "evaluacion", "orden_compra", "seguimiento", "recepcion",
] as const;
export type DbStage = typeof STAGE_ORDER[number];

export interface PdcRow {
  id: string;
  pdc_number: string;
  name: string;
  project: string;
  description: string | null;
  category: string | null;
  criticality: string;
  estimated_amount: number | null;
  currency: string | null;
  required_on_site_date: string | null;
  current_stage: string;
  requesting_area: string | null;
  et_document_code: string | null;
  engineering_responsible: string | null;
  responsible_name: string | null;
  approval_status: string | null;
  approval_required_role: string | null;
  approval_target_stage: string | null;
  process_type: string | null;
  project_id: string | null;
  predecessor_process_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function rowToPdc(r: PdcRow): Pdc {
  return {
    id: r.id,
    pdc_number: r.pdc_number,
    project: r.project,
    title: r.name,
    description: r.description ?? "",
    category: r.category ?? "",
    criticality: CRIT_DB_TO_FE[r.criticality] ?? "medium",
    estimated_amount: Number(r.estimated_amount ?? 0),
    currency: r.currency ?? "USD",
    required_on_site_date: r.required_on_site_date ?? "",
    current_status: STAGE_TO_STATUS[r.current_stage] ?? "draft",
    current_owner: r.responsible_name ?? "—",
    created_at: r.created_at,
    updated_at: r.updated_at,
    current_stage: r.current_stage as DbStage,
    tenant_id: (r as PdcRow & { tenant_id?: string }).tenant_id ?? null,

    approval_status: (r.approval_status as Pdc["approval_status"]) ?? null,
    approval_required_role: r.approval_required_role ?? null,
    approval_target_stage: r.approval_target_stage ?? null,
    process_type: (r.process_type as Pdc["process_type"]) ?? "compra",
    project_id: r.project_id ?? null,
    predecessor_process_id: r.predecessor_process_id ?? null,
  };
}

/** Lista PdCs del tenant del usuario (RLS filtra). Soporta filtros opcionales. */
export function usePdcs(filters?: PdcFilters): UseQueryResult<Pdc[], Error> {
  return useQuery({
    queryKey: queryKeys.pdcs(filters),
    queryFn: async () => {
      let q = supabase.from("purchase_processes").select("*").order("created_at", { ascending: false });
      if (filters?.project) q = q.ilike("project", `%${filters.project}%`);
      if (filters?.criticality) q = q.eq("criticality", CRIT_FE_TO_DB[filters.criticality]);
      if (filters?.stage) q = q.eq("current_stage", filters.stage as DbStage);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data as unknown as PdcRow[]).map(rowToPdc);
    },
  });
}

/** Detalle de un PdC. */
export function usePdc(id: string | undefined): UseQueryResult<Pdc | null, Error> {
  return useQuery({
    queryKey: id ? queryKeys.pdc(id) : ["pdcs", "none"],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_processes").select("*").eq("id", id!).maybeSingle();
      if (error) throw new Error(error.message);
      return data ? rowToPdc(data as unknown as PdcRow) : null;
    },
  });
}

export interface CreatePdcInput {
  project: string;
  project_id?: string | null;
  process_type?: ProcessType;
  predecessor_process_id?: string | null;
  name: string;
  description?: string | null;
  category?: string | null;
  criticality: Criticality;
  estimated_amount?: number | null;
  currency: string;
  required_on_site_date: string;
  requesting_area?: string;
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
          project: input.project,
          project_id: input.project_id ?? null,
          process_type: input.process_type ?? "compra",
          predecessor_process_id: input.predecessor_process_id ?? null,
          description: input.description ?? null,
          category: input.category ?? null,
          criticality: CRIT_FE_TO_DB[input.criticality],
          estimated_amount: input.estimated_amount ?? null,
          currency: input.currency,
          required_on_site_date: input.required_on_site_date,
          requesting_area: input.requesting_area || "Sin especificar",
          responsible_name: input.responsible_name ?? null,
          et_document_code: null,
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
    project: string;
    project_id: string | null;
    process_type: ProcessType;
    description: string | null;
    category: string | null;
    criticality: Criticality;
    estimated_amount: number | null;
    currency: string;
    required_on_site_date: string;
    requesting_area: string;
    responsible_name: string | null;
    current_stage: DbStage;
  }>;
}

export function useUpdatePdc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: UpdatePdcInput) => {
      const { criticality, ...rest } = patch;
      const { error } = await supabase
        .from("purchase_processes")
        .update({
          ...rest,
          ...(criticality !== undefined ? { criticality: CRIT_FE_TO_DB[criticality] } : {}),
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["pdcs"] });
      qc.invalidateQueries({ queryKey: queryKeys.pdc(vars.id) });
    },
  });
}

interface ApprovalRuleRow {
  id: string;
  condition_type: "amount" | "criticality" | "both";
  amount_threshold: number | null;
  criticality_level: string | null;
  required_role: string;
  stage: string;
  active: boolean;
  label: string;
}

/**
 * Avanza la etapa del PdC a la siguiente del flujo. Antes de avanzar consulta
 * `approval_matrix`: si hay regla activa para la etapa destino que aplica al PdC
 * (por monto o criticidad), deja `approval_status='pending'` y crea una alerta
 * dirigida al rol requerido en lugar de avanzar.
 */
export function useAdvanceStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pdcId: string): Promise<{ advanced: boolean; pendingRole?: string }> => {
      const { data: pdc, error: pdcErr } = await supabase
        .from("purchase_processes")
        .select("id, tenant_id, current_stage, criticality, estimated_amount, name, pdc_number")
        .eq("id", pdcId).single();
      if (pdcErr) throw new Error(pdcErr.message);

      const idx = STAGE_ORDER.indexOf(pdc.current_stage as DbStage);
      if (idx < 0 || idx >= STAGE_ORDER.length - 1) {
        throw new Error("El proceso ya está en la última etapa.");
      }
      const nextStage = STAGE_ORDER[idx + 1];

      // Buscar regla aplicable
      const { data: rules, error: rulesErr } = await supabase
        .from("approval_matrix")
        .select("id, condition_type, amount_threshold, criticality_level, required_role, stage, active, label")
        .eq("stage", nextStage)
        .eq("active", true);
      if (rulesErr) throw new Error(rulesErr.message);

      const matched = (rules as unknown as ApprovalRuleRow[]).find((r) => {
        const amountOk = r.condition_type === "amount" || r.condition_type === "both"
          ? (pdc.estimated_amount ?? 0) > Number(r.amount_threshold ?? Infinity)
          : true;
        const critOk = r.condition_type === "criticality" || r.condition_type === "both"
          ? r.criticality_level === pdc.criticality
          : true;
        if (r.condition_type === "amount") return amountOk;
        if (r.condition_type === "criticality") return critOk;
        return amountOk && critOk;
      });

      if (matched) {
        const { error: upErr } = await supabase
          .from("purchase_processes")
          .update({
            approval_status: "pending",
            approval_required_role: matched.required_role as
              | "admin" | "compras" | "ingenieria" | "programacion" | "gerente" | "planificacion" | "logistica",
            approval_target_stage: nextStage,
          })
          .eq("id", pdcId);
        if (upErr) throw new Error(upErr.message);

        await supabase.from("alerts").insert({
          tenant_id: pdc.tenant_id,
          pdc_id: pdcId,
          type: "approval_required",
          severity: "high",
          message: `${pdc.pdc_number} requiere aprobación de ${matched.required_role} para avanzar a ${nextStage}.`,
          owner_role: matched.required_role as
            | "admin" | "compras" | "ingenieria" | "programacion" | "gerente" | "planificacion" | "logistica",
        });
        return { advanced: false, pendingRole: matched.required_role };
      }

      // Sin bloqueo → avanza
      const { error: advErr } = await supabase
        .from("purchase_processes")
        .update({ current_stage: nextStage })
        .eq("id", pdcId);
      if (advErr) throw new Error(advErr.message);
      return { advanced: true };
    },
    onSuccess: (_d, pdcId) => {
      qc.invalidateQueries({ queryKey: ["pdcs"] });
      qc.invalidateQueries({ queryKey: queryKeys.pdc(pdcId) });
      qc.invalidateQueries({ queryKey: queryKeys.milestones(pdcId) });
      qc.invalidateQueries({ queryKey: queryKeys.alerts() });
    },
  });
}
