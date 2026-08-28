import { useRef, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2, Paperclip, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FileTypeIcon } from "@/components/FileTypeIcon";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { formatDate } from "@/lib/stageLabels";
import {
  usePermitDocuments,
  useDeletePermitDocument,
  type PermitDocument,
} from "@/hooks/usePermits";
import {
  ACCEPTED_EXT,
  MAX_FILE_SIZE,
  downloadPermitDocument,
  formatFileSize,
  useUploadPermitDocuments,
} from "@/hooks/usePermitDocuments";
import { PERMIT_DOCUMENT_TYPES, PERMIT_DOCUMENT_TYPE_LABELS } from "@/lib/permits";

/** Documentos del trámite con carga real de archivos a almacenamiento. */
export function PermitDocumentsSection({ permitId }: { permitId: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: docs, isLoading } = usePermitDocuments(permitId);
  const { data: people } = useTenantUsers();
  const upload = useUploadPermitDocuments(permitId);
  const remove = useDeletePermitDocument(permitId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [documentType, setDocumentType] = useState<string>("solicitud");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);

  const nameFor = (id: string | null) =>
    people?.find((p) => p.id === id)?.full_name ?? people?.find((p) => p.id === id)?.email ?? "—";

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    const invalid = files.filter(
      (f) => !ACCEPTED_EXT.some((e) => f.name.toLowerCase().endsWith(e)),
    );
    if (invalid.length) {
      toast.error(`Formato no permitido: ${invalid.map((f) => f.name).join(", ")}`);
      return;
    }
    const tooBig = files.filter((f) => f.size > MAX_FILE_SIZE);
    if (tooBig.length) {
      toast.error(`Máximo 20 MB por archivo: ${tooBig.map((f) => f.name).join(", ")}`);
      return;
    }
    upload.mutate(
      { files, documentType, description },
      {
        onSuccess: () => {
          toast.success(files.length > 1 ? "Documentos subidos" : "Documento subido");
          setDescription("");
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleDelete = (doc: PermitDocument) => {
    const label = doc.file_name ?? doc.name;
    if (!confirm(`¿Eliminar "${label}"? Esta acción no se puede deshacer.`)) return;
    remove.mutate(doc, {
      onSuccess: () => toast.success("Documento eliminado"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="border rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Paperclip className="w-4 h-4" /> Documentos del trámite
      </h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="permit-doc-type">Tipo de documento</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="permit-doc-type">
              <SelectValue placeholder="Selecciona tipo" />
            </SelectTrigger>
            <SelectContent>
              {PERMIT_DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {PERMIT_DOCUMENT_TYPE_LABELS[t] ?? t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="permit-doc-description">Descripción (opcional)</Label>
          <Input
            id="permit-doc-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ej: Resolución municipal firmada"
          />
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        )}
      >
        {upload.isPending ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          Arrastra archivos aquí o haz clic para subir
        </p>
        <Button type="button" variant="secondary" size="sm" disabled={upload.isPending}>
          Seleccionar archivos
        </Button>
        <p className="text-xs text-muted-foreground">
          PDF, JPG, PNG, Word y Excel · máx. 20 MB por archivo
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXT.join(",")}
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : !docs || docs.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          Sin documentos registrados.
        </p>
      ) : (
        <ul className="space-y-2">
          {docs.map((doc) => {
            const canDelete = isAdmin || doc.uploaded_by === user?.id;
            const label = doc.file_name ?? doc.name;
            const isLegacy = !doc.file_path;
            return (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileTypeIcon name={label} type={doc.file_type} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={label}>
                      {label}
                    </p>
                    {doc.description && (
                      <p className="truncate text-xs text-muted-foreground">{doc.description}</p>
                    )}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {doc.document_type && (
                        <Badge variant="secondary">
                          {PERMIT_DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                        </Badge>
                      )}
                      {doc.file_size != null && <span>{formatFileSize(doc.file_size)}</span>}
                      <span>·</span>
                      <span>{nameFor(doc.uploaded_by)}</span>
                      <span>·</span>
                      <span>{formatDate(doc.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                  {isLegacy ? (
                    doc.file_url && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={doc.file_url} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1 h-4 w-4" />
                          Abrir
                        </a>
                      </Button>
                    )
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadPermitDocument(doc).catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Descargar
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={remove.isPending}
                      onClick={() => handleDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
