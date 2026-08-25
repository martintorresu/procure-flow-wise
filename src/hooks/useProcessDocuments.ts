import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "process-documents";
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const DOC_CATEGORIES = [
  { value: "plano", label: "Plano" },
  { value: "certificado", label: "Certificado" },
  { value: "especificacion", label: "Especificación Técnica" },
  { value: "otro", label: "Otro" },
] as const;

export const ACCEPTED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"];

export interface ProcessDocument {
  id: string;
  process_id: string;
  tenant_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  category: string;
  description: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
}

const SELECT =
  "id, process_id, tenant_id, file_name, file_type, file_size, file_path, category, description, uploaded_by, uploaded_at";

export const processDocumentKeys = {
  byProcess: (processId: string) => ["process_documents", processId] as const,
};

export function useProcessDocuments(processId: string | undefined) {
  return useQuery({
    queryKey: processDocumentKeys.byProcess(processId ?? ""),
    enabled: !!processId,
    queryFn: async (): Promise<ProcessDocument[]> => {
      const { data, error } = await supabase
        .from("process_documents")
        .select(SELECT)
        .eq("process_id", processId!)
        .order("uploaded_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as ProcessDocument[];
    },
  });
}

export function useUploadProcessDocuments(processId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { files: File[]; category: string; description?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Sesión no válida");

      for (const file of input.files) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`"${file.name}" supera los 10 MB permitidos`);
        }
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        const path = `${processId}/${crypto.randomUUID()}${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw new Error(upErr.message);

        const { error } = await supabase.from("process_documents").insert({
          process_id: processId,
          file_name: file.name,
          file_type: file.type || ext.replace(".", ""),
          file_size: file.size,
          file_path: path,
          category: input.category,
          description: input.description?.trim() || null,
          uploaded_by: userId,
        } as never);
        if (error) {
          await supabase.storage.from(BUCKET).remove([path]);
          throw new Error(error.message);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: processDocumentKeys.byProcess(processId) }),
  });
}

export function useDeleteProcessDocument(processId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: ProcessDocument) => {
      const { error } = await supabase.from("process_documents").delete().eq("id", doc.id);
      if (error) throw new Error(error.message);
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: processDocumentKeys.byProcess(processId) }),
  });
}

/** Genera una URL firmada temporal y dispara la descarga. */
export async function downloadProcessDocument(doc: ProcessDocument) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60, {
    download: doc.file_name,
  });
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "No se pudo generar el enlace");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
