import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RequirementCatalogItem {
  id: string;
  code: string;
  stage_number: number;
  stage_name: string;
  activity: string;
  responsible_role: string | null;
  evidence: string | null;
  gate_code: string | null;
  gate_question: string | null;
  gate_route_si: string | null;
  gate_route_no: string | null;
  sort_order: number;
}

export interface BusinessRule {
  id: string;
  code: string;
  condicion: string;
  accion_sistema: string;
  sort_order: number;
}

export type Applicability = "Por validar" | "Aplica" | "No aplica" | "Aplica con condición";
export type RequirementStatus =
  | "No iniciado"
  | "En curso"
  | "Bloqueado"
  | "Listo para aprobación"
  | "Aprobado"
  | "Reabierto";

export const APPLICABILITY_OPTIONS: Applicability[] = [
  "Por validar",
  "Aplica",
  "No aplica",
  "Aplica con condición",
];

export const REQUIREMENT_STATUS_OPTIONS: RequirementStatus[] = [
  "No iniciado",
  "En curso",
  "Bloqueado",
  "Listo para aprobación",
  "Aprobado",
  "Reabierto",
];

export interface ProjectRequirement {
  id: string;
  process_id: string;
  requirement_catalog_id: string;
  applicability: Applicability;
  fundamento: string | null;
  responsible_name: string | null;
  fecha_objetivo: string | null;
  status: RequirementStatus;
  criterio_cierre: string | null;
  evidencia_url: string | null;
  catalog: RequirementCatalogItem | null;
}

const CATALOG_COLUMNS =
  "id, code, stage_number, stage_name, activity, responsible_role, evidence, gate_code, gate_question, gate_route_si, gate_route_no, sort_order";

/** Catálogo de requisitos (plantilla Permisos DOM) del tenant. Solo lectura. */
export function useRequirementCatalog() {
  return useQuery({
    queryKey: ["requirement_catalog"],
    queryFn: async (): Promise<RequirementCatalogItem[]> => {
      const { data, error } = await supabase
        .from("requirement_catalog")
        .select(CATALOG_COLUMNS)
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as RequirementCatalogItem[];
    },
  });
}

/** Reglas de negocio del tenant. Solo lectura. */
export function useBusinessRules() {
  return useQuery({
    queryKey: ["business_rules"],
    queryFn: async (): Promise<BusinessRule[]> => {
      const { data, error } = await supabase
        .from("business_rules")
        .select("id, code, condicion, accion_sistema, sort_order")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as BusinessRule[];
    },
  });
}

/** Instancia de la plantilla para un proceso concreto. */
export function useProjectRequirements(processId: string | undefined) {
  return useQuery({
    queryKey: ["project_requirements", processId],
    enabled: !!processId,
    queryFn: async (): Promise<ProjectRequirement[]> => {
      const { data, error } = await supabase
        .from("project_requirements")
        .select(
          `id, process_id, requirement_catalog_id, applicability, fundamento, responsible_name,
           fecha_objetivo, status, criterio_cierre, evidencia_url,
           catalog:requirement_catalog (${CATALOG_COLUMNS})`,
        )
        .eq("process_id", processId!);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as unknown as ProjectRequirement[];
      return rows.sort((a, b) => (a.catalog?.sort_order ?? 0) - (b.catalog?.sort_order ?? 0));
    },
  });
}

/** Crea una fila por cada ítem del catálogo para el proceso indicado. */
export function useApplyRequirementTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      processId,
      tenantId,
    }: {
      processId: string;
      tenantId: string;
    }): Promise<number> => {
      const { data: catalog, error: catError } = await supabase
        .from("requirement_catalog")
        .select("id")
        .order("sort_order", { ascending: true });
      if (catError) throw new Error(catError.message);
      if (!catalog?.length) throw new Error("El catálogo de requisitos está vacío.");

      const { data: existing, error: exError } = await supabase
        .from("project_requirements")
        .select("requirement_catalog_id")
        .eq("process_id", processId);
      if (exError) throw new Error(exError.message);
      const already = new Set((existing ?? []).map((r) => r.requirement_catalog_id));

      const rows = catalog
        .filter((c) => !already.has(c.id))
        .map((c) => ({
          tenant_id: tenantId,
          process_id: processId,
          requirement_catalog_id: c.id,
          applicability: "Por validar",
          status: "No iniciado",
        }));
      if (rows.length === 0) return 0;

      const { error } = await supabase.from("project_requirements").insert(rows);
      if (error) throw new Error(error.message);
      return rows.length;
    },
    onSuccess: (_n, vars) =>
      qc.invalidateQueries({ queryKey: ["project_requirements", vars.processId] }),
  });
}

export interface RequirementPatch {
  applicability?: Applicability;
  fundamento?: string | null;
  responsible_name?: string | null;
  fecha_objetivo?: string | null;
  status?: RequirementStatus;
  criterio_cierre?: string | null;
}

export function useUpdateProjectRequirement(processId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: RequirementPatch }) => {
      const { error } = await supabase
        .from("project_requirements")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["project_requirements", processId] }),
  });
}
