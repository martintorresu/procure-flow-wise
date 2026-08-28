/** Cálculo del "Estándar de Minuta": puntaje de calidad 0-100. */

export interface QualityCommitmentInput {
  hasResponsible: boolean;
  hasDueDate: boolean;
  dueDateWithinMax: boolean;
}

export interface QualityInput {
  hasProject: boolean;
  hasStage?: boolean;
  hasMeetingDate: boolean;
  participantCount: number;
  commitments: QualityCommitmentInput[];
}

export interface QualityBreakdownItem {
  key: string;
  label: string;
  weight: number;
  ok: boolean;
}

export interface QualityResult {
  score: number;
  breakdown: QualityBreakdownItem[];
}

export const QUALITY_WEIGHTS = {
  project: 15,
  meetingDate: 10,
  participants: 15,
  responsibles: 20,
  dueDates: 20,
  withinMax: 10,
  stage: 10,
} as const;

/** Color semántico del gauge según el puntaje. */
export function qualityColor(score: number): string {
  if (score < 40) return "#ef4444";
  if (score < 60) return "#f97316";
  if (score < 80) return "#eab308";
  if (score < 100) return "#84cc16";
  return "#22c55e";
}

/** Días de diferencia entre dos fechas ISO (yyyy-mm-dd). */
export function daysBetween(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00`).getTime();
  const b = new Date(`${toISO}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86_400_000);
}

/** ¿La fecha de entrega está dentro del máximo permitido desde la reunión? */
export function isWithinMaxDelivery(
  meetingDate: string | null,
  dueDate: string | null,
  maxDays: number,
): boolean {
  if (!dueDate) return false;
  if (!meetingDate) return true;
  return daysBetween(meetingDate, dueDate) <= maxDays;
}

export function calculateQualityScore(input: QualityInput, maxDeliveryDays = 90): QualityResult {
  const list = input.commitments;
  const hasCommitments = list.length > 0;

  const items: QualityBreakdownItem[] = [
    {
      key: "project",
      label: "Proyecto vinculado",
      weight: QUALITY_WEIGHTS.project,
      ok: input.hasProject,
    },
    {
      key: "stage",
      label: "Etapa principal vinculada",
      weight: QUALITY_WEIGHTS.stage,
      ok: !!input.hasStage,
    },
    {
      key: "meetingDate",
      label: "Fecha de reunión",
      weight: QUALITY_WEIGHTS.meetingDate,
      ok: input.hasMeetingDate,
    },
    {
      key: "participants",
      label: "Participantes registrados",
      weight: QUALITY_WEIGHTS.participants,
      ok: input.participantCount > 0,
    },
    {
      key: "responsibles",
      label: "Cada compromiso tiene responsable",
      weight: QUALITY_WEIGHTS.responsibles,
      ok: hasCommitments && list.every((c) => c.hasResponsible),
    },
    {
      key: "dueDates",
      label: "Cada compromiso tiene fecha de entrega",
      weight: QUALITY_WEIGHTS.dueDates,
      ok: hasCommitments && list.every((c) => c.hasDueDate),
    },
    {
      key: "withinMax",
      label: `Fechas dentro del máximo permitido (${maxDeliveryDays} días)`,
      weight: QUALITY_WEIGHTS.withinMax,
      ok: hasCommitments && list.every((c) => c.dueDateWithinMax),
    },
  ];

  const score = items.reduce((acc, i) => acc + (i.ok ? i.weight : 0), 0);
  return { score, breakdown: items };
}
