import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MinutaParticipantInput {
  userId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  guestCompany?: string | null;
  isGuest: boolean;
}

export interface CreateSessionInput {
  title: string;
  meetingDate: string;
  processId: string | null;
  processStageId?: string | null;
  qualityScore: number;
  participants: MinutaParticipantInput[];
  transcript?: string;
}


/** Crea la sesión de minuta y registra sus participantes. Devuelve el id de la sesión. */
export function useCreateMinutaSession() {
  return useMutation({
    mutationFn: async (input: CreateSessionInput): Promise<string> => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id ?? null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", uid ?? "")
        .maybeSingle();
      const tenantId = prof?.tenant_id;
      if (!tenantId) throw new Error("No se pudo determinar la organización");

      const { data: session, error } = await supabase
        .from("minuta_sessions")
        .insert({
          tenant_id: tenantId,
          title: input.title,
          meeting_date: input.meetingDate,
          process_id: input.processId,
          process_stage_id: input.processStageId ?? null,
          quality_score: input.qualityScore,
          status: "submitted",
          created_by: uid,
          transcript: input.transcript ?? null,
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (input.participants.length) {
        const { error: pErr } = await supabase.from("minuta_participants").insert(
          input.participants.map((p) => ({
            tenant_id: tenantId,
            meeting_session_id: session.id,
            user_id: p.isGuest ? null : (p.userId ?? null),
            guest_name: p.guestName ?? null,
            guest_email: p.guestEmail ?? null,
            guest_company: p.guestCompany ?? null,
            is_guest: p.isGuest,
          })),
        );
        if (pErr) console.warn("[minuta] participantes:", pErr.message);
      }

      return session.id as string;
    },
  });
}

/** Actualiza el puntaje de calidad de una sesión existente. */
export function useUpdateMinutaQualityScore() {
  return useMutation({
    mutationFn: async ({ sessionId, score }: { sessionId: string; score: number }) => {
      const { error } = await supabase
        .from("minuta_sessions")
        .update({ quality_score: score })
        .eq("id", sessionId);
      if (error) throw new Error(error.message);
    },
  });
}
