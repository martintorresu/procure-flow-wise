import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType2,
  File as FileIcon,
  Download,
  Trash2,
  Upload,
  Loader2,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/contexts/AuthContext";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { formatDate } from "@/lib/stageLabels";
import {
  ACCEPTED_EXT,
  DOC_CATEGORIES,
  MAX_FILE_SIZE,
  downloadProcessDocument,
  formatFileSize,
  useDeleteProcessDocument,
  useProcessDocuments,
  useUploadProcessDocuments,
  type ProcessDocument,
} from "@/hooks/useProcessDocuments";

function categoryLabel(value: string) {
  return DOC_CATEGORIES.find((c) => c.value === value)?.label ?? "Otro";
}

function FileTypeIcon({ name, type }: { name: string; type: string }) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const base = "h-5 w-5 shrink-0";
  if (ext === "pdf" || type.includes("pdf")) return <FileText className={cn(base, "text-red-500")} />;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) || type.startsWith("image/"))
    return <FileImage className={cn(base, "text-violet-500")} />;
  if (["doc", "docx"].includes(ext)) return <FileType2 className={cn(base, "text-blue-500")} />;
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className={cn(base, "text-emerald-600")} />;
  return <FileIcon className={cn(base, "text-muted-foreground")} />;
}

export function ProcessDocuments({ processId }: { processId: string }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const { data: docs, isLoading } = useProcessDocuments(processId);
  const { data: people } = useTenantUsers();
  const upload = useUploadProcessDocuments(processId);
  const remove = useDeleteProcessDocument(processId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<string>("plano");
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
      toast.error(`Máximo 10 MB por archivo: ${tooBig.map((f) => f.name).join(", ")}`);
      return;
    }
    upload.mutate(
      { files, category, description },
      {
        onSuccess: () => {
          toast.success(files.length > 1 ? "Documentos subidos" : "Documento subido");
          setDescription("");
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const handleDelete = (doc: ProcessDocument) => {
    if (!confirm(`¿Eliminar "${doc.file_name}"? Esta acción no se puede deshacer.`)) return;
    remove.mutate(doc, {
      onSuccess: () => toast.success("Documento eliminado"),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Documentos del proceso</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Metadatos previos a la subida */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="doc-category">Categoría</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="doc-category">
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {DOC_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Descripción (opcional)</Label>
            <Input
              id="doc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Plano de montaje revisión B"
            />
          </div>
        </div>

        {/* Zona drag & drop */}
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
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8",
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
            PDF, JPG, PNG, Word y Excel · máx. 10 MB por archivo
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

        {/* Listado */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !docs || docs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay documentos adjuntos. Arrastra archivos aquí o haz clic para subir.
          </p>
        ) : (
          <ul className="space-y-2">
            {docs.map((doc) => {
              const canDelete = isAdmin || doc.uploaded_by === user?.id;
              return (
                <li
                  key={doc.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <FileTypeIcon name={doc.file_name} type={doc.file_type} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium" title={doc.file_name}>
                        {doc.file_name}
                      </p>
                      {doc.description && (
                        <p className="truncate text-xs text-muted-foreground">{doc.description}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary">{categoryLabel(doc.category)}</Badge>
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>·</span>
                        <span>{nameFor(doc.uploaded_by)}</span>
                        <span>·</span>
                        <span>{formatDate(doc.uploaded_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2 self-end sm:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        downloadProcessDocument(doc).catch((e: Error) => toast.error(e.message))
                      }
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Descargar
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        disabled={remove.isPending && remove.variables?.id === doc.id}
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
      </CardContent>
    </Card>
  );
}
