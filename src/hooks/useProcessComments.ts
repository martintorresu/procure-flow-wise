import { useMutation, useQuery, useQueryClient, type UseQueryResult } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProcessComment {
  id: string;
  process_id: string;
  author_user_id: string;
  body: string;
  created_at: string;
  author_name?: string;
}

/** Comentarios de un proceso. RLS: internos del tenant + participantes aceptados. */
export function useProcessComments(processId: string | undefined): UseQueryResult<ProcessComment[], Error> {
  return useQuery({
    queryKey: ["process_comments", processId ?? "none"],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("process_comments")
        .select("id, process_id, author_user_id, body, created_at")
        .eq("process_id", processId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProcessComment[];
    },
  });
}

export function useAddProcessComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { processId: string; tenantId: string; authorUserId: string; body: string }) => {
      const { data, error } = await supabase
        .from("process_comments")
        .insert({
          process_id: input.processId,
          tenant_id: input.tenantId,
          author_user_id: input.authorUserId,
          body: input.body.trim(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      // Notificación por email: best-effort, nunca bloquea ni falla el comentario.
      let emailWarning: string | undefined;
      try {
        const { error: fnError } = await supabase.functions.invoke("send-comment-notification", {
          body: { commentId: (data as { id: string }).id, origin: window.location.origin },
        });
        if (fnError) emailWarning = fnError.message;
      } catch (e) {
        emailWarning = (e as Error).message;
      }
      return { emailWarning };
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["process_comments", vars.processId] }),
  });
}

