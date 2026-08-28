import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CommitmentPriority, CommitmentStatus } from "@/lib/commitments";

export interface StageCommitment {
  id: string;
  stage_id: string | null;
  activity_ref: string | null;
  commitment_text: string;
  responsible_user_id: string | null;
  responsible_name: string | null;
  due_date: string | null;
  priority: CommitmentPriority | null;
  status: CommitmentStatus;
  meeting_date: string | null;
  meeting_title: string | null;
  meeting_session_id: string | null;
}

const SELECT =
  "id, stage_id, activity_ref, commitment_text, responsible_user_id, responsible_name, due_date, priority, status, meeting_date, meeting_title, meeting_session_id";

/** Compromisos de un proceso que están vinculados a alguna etapa. */
export function useStageCommitments(processId: string | undefined) {
  return useQuery({
    queryKey: ["stage-commitments", processId ?? ""],
    enabled: !!processId,
    queryFn: async (): Promise<StageCommitment[]> => {
      const { data, error } = await supabase
        .from("process_commitments")
        .select(SELECT)
        .eq("process_id", processId!)
        .not("stage_id", "is", null)
        .order("meeting_date", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as StageCommitment[];
    },
  });
}
