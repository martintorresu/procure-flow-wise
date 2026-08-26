import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { alertBucketFor, daysUntil, permitAlertMessage, type PermitStatus } from "@/lib/permits";

const PLACEHOLDER_TENANT = "00000000-0000-0000-0000-000000000000";

export interface Permit {
  id: string;
  tenant_id: string;
  pdc_id: string | null;
  permit_type_id: string | null;
  permit_type: string;
  permit_number: string | null;
  issuing_authority: string | null;
  application_date: string | null;
  approval_date: string | null;
  expiration_date: string | null;
  status: PermitStatus;
  renewal_of: string | null;
  project_id: string | null;
  responsible_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermitType {
  id: string;
  tenant_id: string;
  name: string;
  category: string | null;
  typical_authority: string | null;
  typical_duration_days: number | null;
  requires_renewal: boolean;
  sort_order: number;
  enabled: boolean;
}

export interface PermitDocument {
  id: string;
  permit_id: string;
  name: string;
  file_url: string | null;
  document_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

const PERMIT_SELECT =
  "id, tenant_id, pdc_id, permit_type_id, permit_type, permit_number, issuing_authority, application_date, approval_date, expiration_date, status, renewal_of, project_id, responsible_user_id, notes, created_at, updated_at";

export const permitKeys = {
  all: ["permits"] as const,
  byProject: (projectId: string) => ["permits", "project", projectId] as const,
  types: ["permit_types"] as const,
  documents: (permitId: string) => ["permit_documents", permitId] as const,
};

/** Permisos del tenant, ordenados por vencimiento más próximo primero. */
export function usePermits() {
  return useQuery({
    queryKey: permitKeys.all,
    queryFn: async (): Promise<Permit[]> => {
      const { data, error } = await supabase
        .from("permits")
        .select(PERMIT_SELECT)
        .order("expiration_date", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Permit[];
    },
  });
}

/** Permisos asociados a un proyecto. */
export function useProjectPermits(projectId: string | undefined) {
  return useQuery({
    queryKey: permitKeys.byProject(projectId ?? ""),
    enabled: !!projectId,
    queryFn: async (): Promise<Permit[]> => {
      const { data, error } = await supabase
        .from("permits")
        .select(PERMIT_SELECT)
        .eq("project_id", projectId!)
        .order("expiration_date", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Permit[];
    },
  });
}

/** Catálogo de tipos de permiso del tenant. */
export function usePermitTypes(onlyEnabled = false) {
  return useQuery({
    queryKey: [...permitKeys.types, onlyEnabled],
    queryFn: async (): Promise<PermitType[]> => {
      let q = supabase
        .from("permit_types")
        .select("id, tenant_id, name, category, typical_authority, typical_duration_days, requires_renewal, sort_order, enabled")
        .order("sort_order", { ascending: true });
      if (onlyEnabled) q = q.eq("enabled", true);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PermitType[];
    },
  });
}

export type NewPermit = Partial<Omit<Permit, "id" | "tenant_id" | "created_at" | "updated_at">> & {
  permit_type: string;
};

export function useCreatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewPermit): Promise<Permit> => {
      const { data, error } = await supabase
        .from("permits")
        .insert({ ...input, tenant_id: PLACEHOLDER_TENANT } as never)
        .select(PERMIT_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Permit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });
}

export function useUpdatePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<Permit>) => {
      const { id, ...values } = input;
      const { error } = await supabase.from("permits").update(values as never).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });
}

export function useDeletePermit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("permits").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });
}

/* ---------------- Catálogo (Admin) ---------------- */

export function useUpsertPermitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PermitType> & { name: string }) => {
      if (input.id) {
        const { id, tenant_id: _t, ...values } = input;
        const { error } = await supabase.from("permit_types").update(values as never).eq("id", id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase
        .from("permit_types")
        .insert({ ...input, tenant_id: PLACEHOLDER_TENANT } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: permitKeys.types }),
  });
}

export function useDeletePermitType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("permit_types").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: permitKeys.types }),
  });
}

/* ---------------- Documentos ---------------- */

export function usePermitDocuments(permitId: string | undefined) {
  return useQuery({
    queryKey: permitKeys.documents(permitId ?? ""),
    enabled: !!permitId,
    queryFn: async (): Promise<PermitDocument[]> => {
      const { data, error } = await supabase
        .from("permit_documents")
        .select("id, permit_id, name, file_url, document_type, uploaded_by, uploaded_at")
        .eq("permit_id", permitId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PermitDocument[];
    },
  });
}

export function useAddPermitDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { permit_id: string; name: string; file_url?: string | null; document_type?: string | null }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("permit_documents").insert({
        ...input,
        uploaded_by: userRes?.user?.id ?? null,
        tenant_id: PLACEHOLDER_TENANT,
      } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: permitKeys.documents(vars.permit_id) }),
  });
}

export function useDeletePermitDocument(permitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("permit_documents").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: permitKeys.documents(permitId) }),
  });
}

/* ---------------- Renovación ---------------- */

/** Crea un nuevo permiso vinculado como renovación del anterior. */
export function useStartRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (permit: Permit): Promise<Permit> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("permits")
        .insert({
          tenant_id: PLACEHOLDER_TENANT,
          pdc_id: permit.pdc_id,
          permit_type_id: permit.permit_type_id,
          permit_type: permit.permit_type,
          issuing_authority: permit.issuing_authority,
          application_date: today,
          status: "renovacion",
          renewal_of: permit.id,
          project_id: permit.project_id,
          responsible_user_id: permit.responsible_user_id,
          notes: `Renovación de ${permit.permit_number ?? permit.permit_type}`,
        } as never)
        .select(PERMIT_SELECT)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as Permit;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });
}

/* ---------------- Alertas de vencimiento (client-side) ---------------- */

const ACTIVE_STATUSES: PermitStatus[] = ["aprobado", "en_tramite", "renovacion", "vencido"];

/**
 * Revisa los permisos cargados y crea las alertas de vencimiento que falten
 * (60 / 30 / 7 días y vencido). Deduplica por mensaje canónico.
 */
export async function syncPermitAlerts(permits: Permit[]): Promise<number> {
  const candidates = permits
    .filter((p) => ACTIVE_STATUSES.includes(p.status) && !!p.expiration_date)
    .map((p) => ({ permit: p, bucket: alertBucketFor(daysUntil(p.expiration_date)) }))
    .filter((c) => c.bucket !== null) as { permit: Permit; bucket: { bucket: 60 | 30 | 7 | 0; severity: string } }[];

  if (!candidates.length) return 0;

  const { data: existing } = await supabase
    .from("alerts")
    .select("message")
    .eq("type", "permit_expiry")
    .eq("resolved", false);
  const seen = new Set((existing ?? []).map((a) => a.message));

  const rows = candidates
    .map(({ permit, bucket }) => ({
      permit,
      message: permitAlertMessage(permit.permit_number ?? permit.permit_type, bucket.bucket),
      severity: bucket.severity,
    }))
    .filter((r) => !seen.has(r.message));

  if (!rows.length) return 0;

  const { data: inserted, error } = await supabase
    .from("alerts")
    .insert(
      rows.map((r) => ({
        tenant_id: r.permit.tenant_id,
        pdc_id: r.permit.pdc_id,
        type: "permit_expiry",
        severity: r.severity,
        message: r.message,
        due_date: r.permit.expiration_date,
        resolved: false,
      })) as never,
    )
    .select("id");
  if (error) {
    console.warn("[permits] no se pudieron crear alertas:", error.message);
    return 0;
  }

  try {
    const { notifyWhatsappAlert } = await import("@/lib/whatsapp");
    await Promise.all(
      (inserted ?? []).map((a, i) => {
        const userId = rows[i]?.permit.responsible_user_id;
        if (!userId) return Promise.resolve();
        return notifyWhatsappAlert({
          alertId: a.id as string,
          userId,
          tenantId: rows[i].permit.tenant_id,
        });
      }),
    );
  } catch (e) {
    console.warn("[permits] notificación WhatsApp falló:", e);
  }

  return inserted?.length ?? 0;
}

/** Dispara la sincronización de alertas una vez por montaje cuando hay datos. */
export function usePermitAlertSync(permits: Permit[] | undefined) {
  const qc = useQueryClient();
  // Sincroniza una sola vez por conjunto de permisos (evita escrituras en cada render).
  const syncedRef = useRef<string>("");
  useEffect(() => {
    if (!permits || permits.length === 0) return;
    const permitIds = permits.map((p) => p.id).sort().join(",");
    if (syncedRef.current === permitIds) return;
    syncedRef.current = permitIds;
    syncPermitAlerts(permits).then((n) => {
      if (n > 0) qc.invalidateQueries({ queryKey: ["alerts"] });
    });
  }, [permits, qc]);
}

