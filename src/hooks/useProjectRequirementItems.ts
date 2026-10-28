import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProjectProfile } from "@/lib/projectProfile";
import type { ReqApplicability, ReqStatus, ReqOrigin, MappingStatus } from "@/lib/requirementLabels";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export interface FlowStage { id: string; code: string; name: string; sort_order: number; default_process_codes: string[] }
export interface FlowGate { id: string; code: string; flow_stage_id: string; question: string | null; route_yes: string | null; route_no: string | null; sort_order: number }
export interface GateReview { id: string; gate_id: string; answer: string; notes: string | null; reviewed_at: string; created_by: string | null }

export interface RequirementItem {
  id: string;
  tenant_id: string;
  project_id: string;
  origin_type: ReqOrigin;
  origin_id: string | null;
  code: string;
  name: string;
  process_code: string | null;
  legal_reference: string | null;
  origin_version: string | null;
  evidence_required: string | null;
  evidence_pending: boolean;
  suggested_code: string | null;
  activation_mode: string;
  rule_id: string | null;
  rule_explanation: string | null;
  mapping_status: MappingStatus;
  applicability: ReqApplicability;
  status: ReqStatus | null;
  flow_stage_id: string | null;
  priority: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  due_date: string | null;
  fulfilled_at: string | null;
  folio: string | null;
  link_url: string | null;
  notes: string | null;
  justification: string | null;
  closed_at: string | null;
  observation_reason: string | null;
  corrective_action: string | null;
  process_id: string | null;
  stage_id: string | null;
  updated_at: string;
}

export interface RequirementDocument {
  id: string;
  project_requirement_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  document_type: string | null;
  issuer: string | null;
  folio: string | null;
  issued_at: string | null;
  expires_at: string | null;
  review_status: "in_review" | "approved" | "observed";
  version: number;
  replaces_id: string | null;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
}

export interface RequirementEvent {
  id: string;
  project_requirement_id: string | null;
  action: string;
  field: string | null;
  old_value: unknown;
  new_value: unknown;
  justification: string | null;
  rule_id: string | null;
  created_by: string | null;
  created_at: string;
}

export const reqKeys = {
  items: (projectId?: string) => ["req-items", projectId] as const,
  docs: (projectId?: string) => ["req-docs", projectId] as const,
  events: (reqId?: string) => ["req-events", reqId] as const,
  projectEvents: (projectId?: string) => ["req-project-events", projectId] as const,
  gates: (projectId?: string) => ["req-gate-reviews", projectId] as const,
  projectProcesses: (projectId?: string) => ["req-project-processes", projectId] as const,
  projectMeta: (projectId?: string) => ["req-project-meta", projectId] as const,
};

/* ------------------------------- Catálogo / flujo ------------------------------- */

export function useFlow() {
  return useQuery({
    queryKey: ["flow-stages-gates"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [s, g] = await Promise.all([
        db.from("flow_stages").select("id, code, name, sort_order, default_process_codes").order("sort_order"),
        db.from("flow_gates").select("id, code, flow_stage_id, question, route_yes, route_no, sort_order").order("sort_order"),
      ]);
      if (s.error) throw new Error(s.error.message);
      if (g.error) throw new Error(g.error.message);
      return { stages: s.data as FlowStage[], gates: g.data as FlowGate[] };
    },
  });
}

export interface CatalogProcessRow { process_code: string; name: string; default_flow_stage: string | null; family: string | null; catalog_version: string | null }
export interface CatalogRequirementRow {
  id: string; requirement_code: string; process_code: string; requirement_name: string; requirement_level: string | null;
  evidence_required: string | null; evidence_pending: boolean; legal_reference: string | null; recipient: string | null;
  issuer: string | null; default_priority: string | null; catalog_version: string | null; group_name: string | null;
}

/** Catálogo vigente (vistas *_current). */
export function useLegalCatalog() {
  return useQuery({
    queryKey: ["legal-catalog-current"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [p, pr, r, rr] = await Promise.all([
        db.from("legal_processes_current").select("process_code, name, default_flow_stage, family, catalog_version").order("process_code"),
        db.from("process_applicability_rules_current").select("process_code, condition_json, explanation, applicability"),
        db.from("legal_requirements_current")
          .select("id, requirement_code, process_code, requirement_name, requirement_level, evidence_required, evidence_pending, legal_reference, recipient, issuer, default_priority, catalog_version, group_name")
          .order("requirement_code").limit(5000),
        db.from("applicability_rules_current").select("rule_id, requirement_code, condition_json, action, priority, explanation, active").limit(5000),
      ]);
      for (const x of [p, pr, r, rr]) if (x.error) throw new Error(x.error.message);
      return {
        processes: p.data as CatalogProcessRow[],
        processRules: pr.data as { process_code: string; condition_json: unknown; explanation: string | null; applicability: string | null }[],
        requirements: r.data as CatalogRequirementRow[],
        rules: rr.data as { rule_id: string; requirement_code: string; condition_json: unknown; action: string; priority: number; explanation: string | null; active: boolean }[],
      };
    },
  });
}

export interface MunicipalRequirementRow {
  id: string; code: string; name: string; description: string | null; requirement_type: string; evidence_required: string | null;
  issuer: string | null; flow_stage_code: string | null; process_code: string | null; source: string; verified_at: string | null; legal_requirement_id: string | null; mapping_status: string;
}

export function useMunicipalRequirements(municipalityId: string | null | undefined) {
  return useQuery({
    queryKey: ["municipal-reqs", municipalityId],
    enabled: !!municipalityId,
    queryFn: async () => {
      const { data, error } = await db.from("municipal_requirements")
        .select("id, code, name, description, requirement_type, evidence_required, issuer, flow_stage_code, process_code, source, verified_at, legal_requirement_id, mapping_status")
        .eq("municipality_id", municipalityId).eq("status", "active").order("code");
      if (error) throw new Error(error.message);
      return data as MunicipalRequirementRow[];
    },
  });
}

export function useMunicipalities() {
  return useQuery({
    queryKey: ["municipalities"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await db.from("municipalities").select("id, name, region").order("name");
      if (error) throw new Error(error.message);
      return data as { id: string; name: string; region: string | null }[];
    },
  });
}

/* ---------------------------------- Proyecto ---------------------------------- */

export function useProjectMeta(projectId: string | undefined) {
  return useQuery({
    queryKey: reqKeys.projectMeta(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("projects").select("id, name, tenant_id, municipality_id, profile").eq("id", projectId).maybeSingle();
      if (error) throw new Error(error.message);
      return data as { id: string; name: string; tenant_id: string; municipality_id: string | null; profile: ProjectProfile } | null;
    },
  });
}

export function useSaveProjectProfile(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { profile: ProjectProfile; municipality_id: string | null }) => {
      const { error } = await db.from("projects").update(v).eq("id", projectId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reqKeys.projectMeta(projectId) }),
  });
}

export interface ProjectProcessRow { id: string; process_code: string; suggested: boolean; suggestion_explanation: string | null; confirmed_by: string | null; confirmed_at: string | null; active: boolean }

export function useProjectProcessSelection(projectId: string | undefined) {
  return useQuery({
    queryKey: reqKeys.projectProcesses(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("project_processes")
        .select("id, process_code, suggested, suggestion_explanation, confirmed_by, confirmed_at, active").eq("project_id", projectId);
      if (error) throw new Error(error.message);
      return data as ProjectProcessRow[];
    },
  });
}

export function useSaveProcessSelection(projectId: string | undefined, tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: { process_code: string; suggested: boolean; suggestion_explanation: string; active: boolean }[]) => {
      const { data: auth } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const payload = rows.map((r) => ({
        ...r, project_id: projectId, tenant_id: tenantId, confirmed_by: auth.user?.id ?? null, confirmed_at: now,
      }));
      const { error } = await db.from("project_processes").upsert(payload, { onConflict: "project_id,process_code" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reqKeys.projectProcesses(projectId) }),
  });
}

export function useRequirementItems(projectId: string | undefined) {
  return useQuery({
    queryKey: reqKeys.items(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("project_requirement_items").select("*").eq("project_id", projectId).order("code").limit(5000);
      if (error) throw new Error(error.message);
      return data as RequirementItem[];
    },
  });
}

export function useRequirementDocuments(projectId: string | undefined, reqIds: string[]) {
  return useQuery({
    queryKey: [...reqKeys.docs(projectId), reqIds.length],
    enabled: !!projectId && reqIds.length > 0,
    queryFn: async () => {
      const out: RequirementDocument[] = [];
      for (let i = 0; i < reqIds.length; i += 200) {
        const { data, error } = await db.from("requirement_documents").select("*").in("project_requirement_id", reqIds.slice(i, i + 200)).order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        out.push(...(data as RequirementDocument[]));
      }
      return out;
    },
  });
}

export function useRequirementEvents(reqId: string | undefined) {
  return useQuery({
    queryKey: reqKeys.events(reqId),
    enabled: !!reqId,
    queryFn: async () => {
      const { data, error } = await db.from("requirement_events").select("*").eq("project_requirement_id", reqId).order("created_at", { ascending: false }).limit(300);
      if (error) throw new Error(error.message);
      return data as RequirementEvent[];
    },
  });
}

export async function fetchProjectEvents(projectId: string) {
  const { data, error } = await db.from("requirement_events").select("*").eq("project_id", projectId).order("created_at", { ascending: true }).limit(10000);
  if (error) throw new Error(error.message);
  return data as RequirementEvent[];
}

export function useGateReviews(projectId: string | undefined) {
  return useQuery({
    queryKey: reqKeys.gates(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db.from("flow_gate_reviews").select("id, gate_id, answer, notes, reviewed_at, created_by").eq("project_id", projectId).order("reviewed_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data as GateReview[];
    },
  });
}

export function useAddGateReview(projectId: string | undefined, tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { gate_id: string; answer: string; notes: string }) => {
      const { error } = await db.from("flow_gate_reviews").insert({ ...v, project_id: projectId, tenant_id: tenantId, reviewed_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reqKeys.gates(projectId) }),
  });
}

export type NewRequirementItem = Partial<RequirementItem> & Pick<RequirementItem, "code" | "name" | "origin_type">;

export function useInsertRequirementItems(projectId: string | undefined, tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: NewRequirementItem[]) => {
      for (let i = 0; i < rows.length; i += 200) {
        const part = rows.slice(i, i + 200).map((r) => ({ ...r, project_id: projectId, tenant_id: tenantId }));
        const { error } = await db.from("project_requirement_items").upsert(part, { onConflict: "project_id,origin_type,code", ignoreDuplicates: true });
        if (error) throw new Error(error.message);
      }
      return rows.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reqKeys.items(projectId) }),
  });
}

export function useUpdateRequirementItem(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<RequirementItem> }) => {
      const { error } = await db.from("project_requirement_items").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: reqKeys.items(projectId) });
      qc.invalidateQueries({ queryKey: reqKeys.events(v.id) });
      qc.invalidateQueries({ queryKey: ["stage-requirements"] });
    },
  });
}

export function useAddRequirementComment(projectId: string | undefined, tenantId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reqId, text }: { reqId: string; text: string }) => {
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db.from("requirement_events").insert({
        tenant_id: tenantId, project_id: projectId, project_requirement_id: reqId, action: "comment",
        new_value: text, created_by: auth.user?.id,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: reqKeys.events(v.reqId) }),
  });
}

export const REQ_BUCKET = "requirement-documents";

export async function uploadRequirementDocument(args: {
  tenantId: string; projectId: string; req: RequirementItem; file: File;
  meta: { document_type?: string | null; issuer?: string | null; folio?: string | null; issued_at?: string | null; expires_at?: string | null };
  replacesId?: string | null;
}) {
  const ext = args.file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const path = `${args.tenantId}/${args.projectId}/${args.req.id}/${crypto.randomUUID()}.${ext}`;
  const up = await supabase.storage.from(REQ_BUCKET).upload(path, args.file, { contentType: args.file.type || "application/octet-stream" });
  if (up.error) throw new Error(up.error.message);
  const { error } = await db.from("requirement_documents").insert({
    tenant_id: args.tenantId, project_requirement_id: args.req.id, file_name: args.file.name, file_path: path,
    file_size: args.file.size, mime_type: args.file.type || null, replaces_id: args.replacesId ?? null,
    document_type: args.meta.document_type || null, issuer: args.meta.issuer || null, folio: args.meta.folio || null,
    issued_at: args.meta.issued_at || null, expires_at: args.meta.expires_at || null,
  });
  if (error) {
    await supabase.storage.from(REQ_BUCKET).remove([path]);
    throw new Error(error.message);
  }
}

export function useReviewDocument(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, review_status }: { id: string; review_status: "approved" | "observed" | "in_review" }) => {
      const { error } = await db.from("requirement_documents").update({ review_status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reqKeys.docs(projectId) });
      qc.invalidateQueries({ queryKey: ["req-events"] });
    },
  });
}

/** URL firmada de corta duración (5 minutos). */
export async function signedDocumentUrl(path: string) {
  const { data, error } = await supabase.storage.from(REQ_BUCKET).createSignedUrl(path, 300);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/** Requisitos vinculados a etapas de un proceso (visibilidad bidireccional). */
export function useStageRequirements(processId: string | undefined) {
  return useQuery({
    queryKey: ["stage-requirements", processId],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await db.from("project_requirement_items")
        .select("id, project_id, code, name, applicability, status, stage_id, due_date, owner_name").eq("process_id", processId).order("code");
      if (error) throw new Error(error.message);
      return data as Pick<RequirementItem, "id" | "project_id" | "code" | "name" | "applicability" | "status" | "stage_id" | "due_date" | "owner_name">[];
    },
  });
}

export function useDeleteProcessRequirements(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (let i = 0; i < ids.length; i += 200) {
        const { error } = await db.from("project_requirement_items").delete().in("id", ids.slice(i, i + 200));
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reqKeys.items(projectId) }),
  });
}

/** Actualiza varios requisitos con el mismo cambio (lote). */
export function useBulkUpdateRequirements(projectId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; patch: Partial<RequirementItem> }[]) => {
      const errors: string[] = [];
      for (const u of updates) {
        const { error } = await db.from("project_requirement_items").update(u.patch).eq("id", u.id);
        if (error) errors.push(error.message);
      }
      if (errors.length) throw new Error(`${errors.length} no se actualizaron: ${errors[0]}`);
      return updates.length;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: reqKeys.items(projectId) }),
  });
}
