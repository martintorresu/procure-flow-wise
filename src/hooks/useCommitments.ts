import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CommitmentPriority, CommitmentStatus } from "@/lib/commitments";

export interface Commitment {
  id: string;
  tenant_id: string;
  pdc_id: string | null;
  source: string;
  meeting_date: string | null;
  meeting_title: string | null;
  commitment_text: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  due_date: string | null;
  priority: CommitmentPriority | null;
  status: CommitmentStatus;
  notes: string | null;
  created_at: string;
}

const SELECT =
  "id, tenant_id, pdc_id, source, meeting_date, meeting_title, commitment_text, responsible_user_id, responsible_name, due_date, priority, status, notes, created_at";

const PLACEHOLDER_TENANT = "00000000-0000-0000-0000-000000000000";

export const commitmentKeys = {
  all: ["commitments"] as const,
  byPdc: (pdcId: string) => ["commitments", "pdc", pdcId] as const,
};

/** Todos los compromisos del tenant (RLS filtra). */
export function useCommitments() {
  return useQuery({
    queryKey: commitmentKeys.all,
    queryFn: async (): Promise<Commitment[]> => {
      const { data, error } = await supabase
        .from("process_commitments")
        .select(SELECT)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Commitment[];
    },
  });
}

/** Compromisos vinculados a un proceso. */
export function usePdcCommitments(pdcId: string | undefined) {
  return useQuery({
    queryKey: commitmentKeys.byPdc(pdcId ?? ""),
    enabled: !!pdcId,
    queryFn: async (): Promise<Commitment[]> => {
      const { data, error } = await supabase
        .from("process_commitments")
        .select(SELECT)
        .eq("pdc_id", pdcId!)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Commitment[];
    },
  });
}

export interface NewCommitment {
  commitment_text: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  pdc_id: string | null;
  due_date: string | null;
  priority: CommitmentPriority | null;
  meeting_title: string | null;
  meeting_date: string | null;
  raw_json?: unknown;
}

/** Inserta compromisos en lote (origen manual) y crea alertas para responsables. */
export function useImportCommitments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: NewCommitment[]) => {
      if (!items.length) return { inserted: 0 };
      const { data: userRes } = await supabase.auth.getUser();
      const createdBy = userRes?.user?.id ?? null;

      const rows = items.map((c) => ({
        ...c,
        source: "manual",
        status: "pendiente",
        created_by: createdBy,
        tenant_id: PLACEHOLDER_TENANT,
        raw_json: (c.raw_json ?? null) as never,
      }));

      const { data, error } = await supabase
        .from("process_commitments")
        .insert(rows as never)
        .select("id, tenant_id, pdc_id, responsible_user_id, commitment_text, due_date");
      if (error) throw new Error(error.message);

      // Alertas in-app + WhatsApp (best effort, no bloquea)
      const withUser = (data ?? []).filter((r) => !!r.responsible_user_id);
      if (withUser.length) {
        try {
          const { data: alerts } = await supabase
            .from("alerts")
            .insert(
              withUser.map((r) => ({
                tenant_id: r.tenant_id,
                pdc_id: r.pdc_id,
                type: "commitment",
                severity: "medium",
                message: `Nuevo compromiso: ${r.commitment_text.slice(0, 180)}`,
                due_date: r.due_date,
                resolved: false,
              })) as never,
            )
            .select("id");
          const { notifyWhatsappAlert } = await import("@/lib/whatsapp");
          await Promise.all(
            (alerts ?? []).map((a, i) =>
              notifyWhatsappAlert({
                alertId: a.id as string,
                userId: withUser[i].responsible_user_id as string,
                tenantId: withUser[i].tenant_id as string,
              }),
            ),
          );
        } catch (e) {
          console.warn("[commitments] notificación falló:", e);
        }
      }

      return { inserted: data?.length ?? 0 };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: commitmentKeys.all });
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useUpdateCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string } & Partial<Commitment>) => {
      const { id, ...values } = input;
      const { error } = await supabase.from("process_commitments").update(values as never).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments"] }),
  });
}

export function useDeleteCommitment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("process_commitments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["commitments"] }),
  });
}

export interface ProcessOption { id: string; pdc_number: string; name: string }

/** Lista liviana de procesos del tenant para vincular compromisos. */
export function useProcessOptions() {
  return useQuery({
    queryKey: ["process-options"],
    queryFn: async (): Promise<ProcessOption[]> => {
      const { data, error } = await supabase
        .from("purchase_processes")
        .select("id, pdc_number, name")
        .order("pdc_number", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ProcessOption[];
    },
  });
}
