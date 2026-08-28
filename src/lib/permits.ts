export type PermitStatus =
  | "pendiente"
  | "en_tramite"
  | "aprobado"
  | "rechazado"
  | "vencido"
  | "renovacion";

export const PERMIT_STATUSES: PermitStatus[] = [
  "pendiente",
  "en_tramite",
  "aprobado",
  "rechazado",
  "vencido",
  "renovacion",
];

export const PERMIT_STATUS_LABELS: Record<PermitStatus, string> = {
  pendiente: "Pendiente",
  en_tramite: "En trámite",
  aprobado: "Aprobado",
  rechazado: "Rechazado",
  vencido: "Vencido",
  renovacion: "Renovación",
};

/** Clases de badge por estado (tokens semánticos, sin colores hardcodeados). */
export const PERMIT_STATUS_BADGE: Record<PermitStatus, string> = {
  pendiente: "bg-muted text-muted-foreground border-border",
  en_tramite: "bg-accent/15 text-accent border-accent/30",
  aprobado: "bg-success/15 text-success border-success/30",
  rechazado: "bg-danger/15 text-danger border-danger/30",
  vencido: "bg-danger text-danger-foreground border-danger animate-pulse-slow",
  renovacion: "bg-warning/20 text-warning border-warning/40",
};

/** Color de barra en la vista timeline. */
export const PERMIT_STATUS_BAR: Record<PermitStatus, string> = {
  pendiente: "bg-muted-foreground/40",
  en_tramite: "bg-accent",
  aprobado: "bg-success",
  rechazado: "bg-danger/70",
  vencido: "bg-danger",
  renovacion: "bg-warning",
};

export const PERMIT_CATEGORIES = [
  "municipal",
  "ambiental",
  "sanitario",
  "electrico",
  "gas",
  "agua",
  "vial",
  "otro",
] as const;

export const PERMIT_CATEGORY_LABELS: Record<string, string> = {
  municipal: "Municipal",
  ambiental: "Ambiental",
  sanitario: "Sanitario",
  electrico: "Eléctrico",
  gas: "Gas",
  agua: "Agua",
  vial: "Vial",
  otro: "Otro",
};

export const PERMIT_DOCUMENT_TYPES = [
  "solicitud",
  "resolucion",
  "certificado",
  "plano",
  "informe",
  "anexo",
  "otro",
] as const;

export const PERMIT_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  solicitud: "Solicitud",
  resolucion: "Resolución",
  certificado: "Certificado",
  plano: "Plano",
  informe: "Informe",
  anexo: "Anexo",
  otro: "Otro",
};

export interface ExpiryMeta {
  /** Días hasta el vencimiento (negativo si ya venció). null si no hay fecha. */
  days: number | null;
  overdue: boolean;
  label: string;
  className: string;
}

const DAY_MS = 86_400_000;

/** Días restantes hasta una fecha ISO (YYYY-MM-DD), en base a hoy. */
export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  // UTC explícito: evita corrimientos de un día según el huso del navegador.
  const target = new Date(`${dateIso}T00:00:00Z`);
  if (Number.isNaN(target.getTime())) return null;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return Math.round((target.getTime() - today.getTime()) / DAY_MS);
}


/** Etiqueta e indicador visual del vencimiento de un permiso. */
export function expiryMeta(
  expirationDate: string | null | undefined,
  status?: string | null,
): ExpiryMeta {
  const days = daysUntil(expirationDate);
  if (days === null) {
    return { days: null, overdue: false, label: "Sin vencimiento", className: "text-muted-foreground" };
  }
  if (status === "rechazado") {
    return { days, overdue: false, label: "Rechazado", className: "text-muted-foreground" };
  }
  if (days < 0) {
    const d = Math.abs(days);
    return {
      days,
      overdue: true,
      label: `Vencido hace ${d} ${d === 1 ? "día" : "días"}`,
      className: "text-danger font-semibold",
    };
  }
  if (days === 0) return { days, overdue: false, label: "Vence hoy", className: "text-danger font-semibold" };
  if (days <= 7) return { days, overdue: false, label: `Vence en ${days} ${days === 1 ? "día" : "días"}`, className: "text-danger font-medium" };
  if (days <= 30) return { days, overdue: false, label: `Vence en ${days} ${days === 1 ? "día" : "días"}`, className: "text-warning font-medium" };
  if (days <= 60) return { days, overdue: false, label: `Vence en ${days} ${days === 1 ? "día" : "días"}`, className: "text-warning" };
  return { days, overdue: false, label: `Vence en ${days} ${days === 1 ? "día" : "días"}`, className: "text-muted-foreground" };
}

/** Suma días a una fecha ISO y devuelve ISO (YYYY-MM-DD). */
export function addDaysIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export type AlertBucket = 60 | 30 | 7 | 0;

/** Determina el umbral de alerta aplicable según los días restantes. */
export function alertBucketFor(days: number | null): { bucket: AlertBucket; severity: string } | null {
  if (days === null) return null;
  if (days < 0) return { bucket: 0, severity: "critical" };
  if (days <= 7) return { bucket: 7, severity: "high" };
  if (days <= 30) return { bucket: 30, severity: "medium" };
  if (days <= 60) return { bucket: 60, severity: "low" };
  return null;
}

/** Mensaje canónico de la alerta (se usa también para deduplicar). */
export function permitAlertMessage(permitName: string, bucket: AlertBucket): string {
  if (bucket === 0) return `Permiso vencido: ${permitName}`;
  return `Permiso "${permitName}" vence en ${bucket} días o menos`;
}
