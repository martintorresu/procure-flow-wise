import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileType2,
  File as FileIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícono según la extensión / MIME type del archivo. */
export function FileTypeIcon({ name, type }: { name: string; type?: string | null }) {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const mime = type ?? "";
  const base = "h-5 w-5 shrink-0";
  if (ext === "pdf" || mime.includes("pdf")) return <FileText className={cn(base, "text-red-500")} />;
  if (["jpg", "jpeg", "png", "webp", "gif"].includes(ext) || mime.startsWith("image/"))
    return <FileImage className={cn(base, "text-violet-500")} />;
  if (["doc", "docx"].includes(ext)) return <FileType2 className={cn(base, "text-blue-500")} />;
  if (["xls", "xlsx", "csv"].includes(ext))
    return <FileSpreadsheet className={cn(base, "text-emerald-600")} />;
  return <FileIcon className={cn(base, "text-muted-foreground")} />;
}
