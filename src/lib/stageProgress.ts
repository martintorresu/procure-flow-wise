import type { PdcMilestone } from "@/types/pdc";

export interface StageProgress {
  /** Avance real estimado (0-100). */
  real: number;
  /** Avance programado según fechas (0-100). */
  scheduled: number;
}

const DAY = 1000 * 60 * 60 * 24;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

/**
 * Aproxima el avance del tramo que termina en la etapa crítica, usando
 * únicamente datos ya existentes en purchase_milestones (planned/actual/deviation).
 * Devuelve null si no hay planned_date suficiente para calcular.
 */
export function computeStageProgress(
  milestones: PdcMilestone[],
  stageKey: string,
  processCreatedAt?: string
): StageProgress | null {
  if (!milestones.length) return null;

  const sorted = [...milestones]
    .filter((m) => !!m.planned_date)
    .sort((a, b) => a.planned_date.localeCompare(b.planned_date));
  if (!sorted.length) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[\s-]+/g, "_");
  const key = norm(stageKey);

  let idx = sorted.findIndex((m) => norm(m.milestone_type).includes(key) || key.includes(norm(m.milestone_type)));
  if (idx < 0) idx = sorted.findIndex((m) => !m.actual_date);
  if (idx < 0) idx = sorted.length - 1;

  const critical = sorted[idx];
  const startISO = idx > 0 ? sorted[idx - 1].planned_date : processCreatedAt;
  if (!critical?.planned_date || !startISO) return null;

  const start = new Date(startISO).getTime();
  const end = new Date(critical.planned_date).getTime();
  const now = Date.now();
  const span = end - start;
  if (!Number.isFinite(span) || span <= 0) return null;

  const scheduled = clamp(((now - start) / span) * 100);

  if (critical.actual_date) return { real: 100, scheduled };

  const spanDays = span / DAY;
  const deviation = Number(critical.deviation_days ?? 0);
  const real = clamp(scheduled - (deviation / spanDays) * 100);

  return { real, scheduled };
}
