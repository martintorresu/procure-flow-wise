/** Etiquetas y colores de aplicabilidad y estado de gestión de requisitos. */
export type ReqApplicability = "applicable" | "review_required" | "not_applicable";
export type ReqStatus = "pending" | "in_progress" | "in_review" | "observed" | "compliant";
export type ReqOrigin = "legal" | "municipal" | "tenant";
export type MappingStatus = "linked" | "pending_validation" | "unmapped";

export const APPLICABILITY_META: Record<ReqApplicability, { label: string; badge: string }> = {
  applicable: { label: "Aplica", badge: "bg-success/15 text-success border-success/30" },
  review_required: { label: "Revisión requerida", badge: "bg-warning/15 text-warning border-warning/30" },
  not_applicable: { label: "No aplica", badge: "bg-muted text-muted-foreground border-border" },
};

export const STATUS_META: Record<ReqStatus, { label: string; badge: string; bar: string }> = {
  pending: { label: "Pendiente", badge: "bg-destructive/10 text-destructive border-destructive/20", bar: "bg-destructive/40" },
  in_progress: { label: "En gestión", badge: "bg-warning/15 text-warning border-warning/30", bar: "bg-warning" },
  in_review: { label: "En revisión", badge: "bg-primary/15 text-primary border-primary/30", bar: "bg-primary" },
  observed: { label: "Observado", badge: "bg-destructive text-destructive-foreground border-destructive", bar: "bg-destructive" },
  compliant: { label: "Conforme", badge: "bg-success text-success-foreground border-success", bar: "bg-success" },
};

export const ORIGIN_LABELS: Record<ReqOrigin, string> = { legal: "Legal", municipal: "Municipal", tenant: "Propio" };
export const MAPPING_LABELS: Record<MappingStatus, string> = {
  linked: "Vinculado",
  pending_validation: "Pendiente de validación",
  unmapped: "Sin vínculo",
};
export const PRIORITY_LABELS: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };
export const LEVEL_LABELS: Record<string, string> = {
  mandatory: "Obligatorio",
  conditional: "Condicional",
  posterior: "Posterior",
  recommended: "Recomendado",
};
export const DOC_REVIEW_LABELS: Record<string, string> = { in_review: "En revisión", approved: "Aprobado", observed: "Observado" };

export const DISCLAIMER =
  "Esta herramienta apoya la gestión y no reemplaza la revisión del arquitecto, de la DOM ni de los organismos sectoriales.";

/** Transiciones de estado ofrecidas en la interfaz (la base de datos las valida igual). */
export function nextStatuses(current: ReqStatus, canManage: boolean): ReqStatus[] {
  switch (current) {
    case "pending": return canManage ? ["in_progress", "compliant"] : ["in_progress"];
    case "in_progress": return canManage ? ["pending", "compliant"] : ["pending"];
    case "in_review": return canManage ? ["compliant", "observed"] : [];
    case "observed": return [];
    case "compliant": return canManage ? ["observed"] : [];
  }
}
