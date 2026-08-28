import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rowToProcess, type ProcessRow } from "@/hooks/useProcesses";
import type { Process } from "@/types/process";

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

const PROJECTS_KEY = ["projects"] as const;

/** Proyectos del tenant (RLS filtra). */
export function useProjects() {
  return useQuery({
    queryKey: PROJECTS_KEY,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, created_at")
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return data as Project[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    enabled: !!id,
    queryFn: async (): Promise<Project | null> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, created_at")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Project) ?? null;
    },
  });
}

/** Crea un proyecto al vuelo. tenant_id lo asigna el trigger. */
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Project> => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ name: name.trim(), tenant_id: "00000000-0000-0000-0000-000000000000" })
        .select("id, name, created_at")
        .single();
      if (error) throw new Error(error.message);
      return data as Project;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: PROJECTS_KEY }),
  });
}

/** Procesos de un proyecto (para la vista de cadena). */
export function useProjectProcesses(projectId: string | undefined) {
  return useQuery({
    queryKey: ["projects", projectId, "processes"],
    enabled: !!projectId,
    queryFn: async (): Promise<Process[]> => {
      const { data, error } = await supabase
        .from("processes")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as unknown as ProcessRow[]).map(rowToProcess);
    },
  });
}
