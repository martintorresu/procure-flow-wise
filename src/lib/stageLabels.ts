/** Etiquetas legibles para claves técnicas usadas en mensajes automáticos. */
export const STAGE_LABELS: Record<string, string> = {
  pending_approval: "Pendiente de aprobación",
  not_started: "No iniciada",
  in_progress: "En curso",
  blocked: "Bloqueada",
  completed: "Completada",
};

/** Convierte una clave técnica en texto legible ("in_progress" → "En curso"). */
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
