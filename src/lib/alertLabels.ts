/** Etiquetas legibles en español para los tipos de alerta generados por el motor automático. */
export const ALERT_TYPE_LABELS: Record<string, string> = {
  commitment_overdue: "Compromiso vencido",
  commitment_due_soon: "Compromiso por vencer",
  stage_stalled: "Etapa estancada",
  stage_blocked: "Etapa bloqueada",
  contingency_open: "Contingencia abierta",
  minuta_quality_low: "Minuta bajo estándar",
  minuta_pending: "Minuta pendiente",
  process_inactive: "Proceso sin actividad",
};

export function formatAlertType(type?: string | null): string {
  if (!type) return "Alerta";
  const k = type.trim().toLowerCase();
  if (ALERT_TYPE_LABELS[k]) return ALERT_TYPE_LABELS[k];
  const spaced = k.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Tiempo relativo simple en español: "hace 5 min", "hace 3 h", "hace 2 d". */
export function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  const m = Math.floor(d / 30);
  return `hace ${m} mes${m > 1 ? "es" : ""}`;
}

export const SEVERITY_LABELS = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
} as const;

export const SEVERITY_DOT = {
  low: "bg-success",
  medium: "bg-warning",
  high: "bg-danger",
  critical: "bg-danger",
} as const;
