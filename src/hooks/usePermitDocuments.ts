import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { permitKeys, type PermitDocument } from "@/hooks/usePermits";

export const PERMIT_BUCKET = "permit-documents";
export const MAX_FILE_SIZE = 20 * 1024 * 1024;
export const ACCEPTED_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx", ".xls", ".xlsx"];

const PLACEHOLDER_TENANT = "00000000-0000-0000-0000-000000000000";

/** Sube uno o más archivos al bucket de permisos y registra sus metadatos. */
export function useUploadPermitDocuments(permitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { files: File[]; documentType: string; description?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) throw new Error("Sesión no válida");

      for (const file of input.files) {
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`"${file.name}" supera los 20 MB permitidos`);
        }
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        const path = `${permitId}/${crypto.randomUUID()}${ext}`;
        const { error: upErr } = await supabase.storage
          .from(PERMIT_BUCKET)
          .upload(path, file, { contentType: file.type || "application/octet-stream" });
        if (upErr) throw new Error(upErr.message);

        const { error } = await supabase.from("permit_documents").insert({
          permit_id: permitId,
          name: file.name,
          file_name: file.name,
          file_path: path,
          file_type: file.type || ext.replace(".", ""),
          file_size: file.size,
          document_type: input.documentType,
          description: input.description?.trim() || null,
          uploaded_by: userId,
          tenant_id: PLACEHOLDER_TENANT,
        } as never);
        if (error) {
          await supabase.storage.from(PERMIT_BUCKET).remove([path]);
          throw new Error(error.message);
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: permitKeys.documents(permitId) }),
  });
}

/** Genera una URL firmada temporal (60 s) y dispara la descarga. */
export async function downloadPermitDocument(doc: PermitDocument) {
  if (!doc.file_path) {
    if (doc.file_url) {
      window.open(doc.file_url, "_blank", "noopener,noreferrer");
      return;
    }
    throw new Error("El documento no tiene archivo asociado");
  }
  const { data, error } = await supabase.storage
    .from(PERMIT_BUCKET)
    .createSignedUrl(doc.file_path, 60, { download: doc.file_name ?? doc.name });
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "No se pudo generar el enlace");
  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
