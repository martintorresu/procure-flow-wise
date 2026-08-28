import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ExternalRole = "mandante" | "contratista" | "proveedor" | "otro";
export type PermissionLevel = "view" | "comment" | "upload";

export interface ProcessParticipant {
  id: string;
  process_id: string;
  tenant_id: string;
  email: string | null;
  external_company: string | null;
  external_role: ExternalRole;
  permission_level: PermissionLevel;
  status: "pending" | "accepted";
  user_id: string | null;
  /** Cargo descriptivo (opcional). No influye en permisos. */
  position_id: string | null;
  invited_at: string;
  accepted_at: string | null;
}


export const EXTERNAL_ROLE_LABELS: Record<ExternalRole, string> = {
  mandante: "Mandante",
  contratista: "Contratista",
  proveedor: "Proveedor",
  otro: "Otro",
};

export const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  view: "Ver",
  comment: "Ver + Comentar",
  upload: "Ver + Subir documentos (próximamente)",
};

/**
 * Participantes de un proceso. RLS: los admins internos del tenant ven todos;
 * un externo solo ve su propia fila.
 */
export function useProcessParticipants(processId: string | undefined): UseQueryResult<ProcessParticipant[], Error> {
  return useQuery({
    queryKey: ["process_participants", processId ?? "none"],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_participants")
        .select("*")
        .eq("process_id", processId!)
        .order("invited_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProcessParticipant[];
    },
  });
}

export interface InviteInput {
  processId: string;
  tenantId: string;
  email: string;
  externalCompany?: string;
  externalRole: ExternalRole;
  permissionLevel: Exclude<PermissionLevel, "upload">;
  invitedBy: string;
  positionId?: string | null;
}


/** Dispara el email de invitación. No lanza: el envío es best-effort. */
export async function sendInviteEmail(participantId: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await supabase.functions.invoke("send-invite-email", {
    body: { participantId, origin: window.location.origin },
  });
  if (error) {
    let details = error.message;
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.text === "function") {
      try { details = await ctx.text(); } catch { /* noop */ }
    }
    return { ok: false, error: details };
  }
  if (data && (data as { error?: string }).error) return { ok: false, error: (data as { error: string }).error };
  return { ok: true };
}

export function useInviteParticipant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InviteInput) => {
      const { data, error } = await supabase
        .from("process_participants")
        .insert({
          process_id: input.processId,
          tenant_id: input.tenantId,
          email: input.email.trim().toLowerCase(),
          external_company: input.externalCompany?.trim() || null,
          external_role: input.externalRole,
          permission_level: input.permissionLevel,
          invited_by: input.invitedBy,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ProcessParticipant;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["process_participants", vars.processId] }),
  });
}

/** Reenvía la invitación por email a un participante pendiente. */
export function useResendInvite() {
  return useMutation({
    mutationFn: async (participantId: string) => {
      const res = await sendInviteEmail(participantId);
      if (!res.ok) throw new Error(res.error ?? "No se pudo enviar el email");
    },
  });
}


/** Vincula invitaciones pendientes del email del usuario logueado. */
export async function claimProcessInvitations(): Promise<void> {
  await supabase.rpc("claim_process_invitations");
}
