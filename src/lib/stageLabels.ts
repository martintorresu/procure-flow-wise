/** Etiquetas legibles para claves técnicas de etapas y estados. */
export const STAGE_LABELS: Record<string, string> = {
  ingenieria: "Ingeniería",
  definicion_tecnica: "Definición Técnica",
  programacion: "Programación",
  planificacion: "Planificación",
  compras: "Compras",
  cotizacion: "Cotización",
  licitacion: "Licitación",
  evaluacion: "Evaluación",
  adjudicacion: "Adjudicación",
  orden_compra: "Orden de Compra",
  seguimiento: "Seguimiento",
  fat: "FAT",
  logistica: "Logística",
  recepcion: "Recepción",
  cerrado: "Cerrado",
  pending_approval: "Pendiente de aprobación",
  po_issued: "Orden de Compra emitida",
  shipping: "En tránsito",
  arrived: "Recibido",
  awarded: "Adjudicado",
  closed: "Cerrado",
};

/** Convierte una clave técnica en texto legible ("orden_compra" → "Orden de Compra"). */
export function formatStageLabel(key?: string | null): string {
  if (!key) return "—";
  const k = key.trim().toLowerCase();
  if (STAGE_LABELS[k]) return STAGE_LABELS[k];
  const spaced = k.replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const KEY_RE = new RegExp(
  `\\b(${Object.keys(STAGE_LABELS).sort((a, b) => b.length - a.length).join("|")})\\b`,
  "gi"
);

/** Reemplaza claves técnicas dentro de un texto libre (mensajes de alertas, etc.). */
export function humanizeTechnicalText(text?: string | null): string {
  if (!text) return "";
  return text.replace(KEY_RE, (m) => STAGE_LABELS[m.toLowerCase()] ?? m);
}

/** Formatea una fecha/timestamp ISO como "20 ago 2026". */
export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
}
