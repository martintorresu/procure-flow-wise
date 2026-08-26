/** Modos de ejecución de una bifurcación por contingencia. */
export type ContingencyMode = "pause_and_attend" | "parallel_effort";
export type ContingencyStatus = "active" | "completed" | "cancelled";

export const CONTINGENCY_MODE_LABELS: Record<ContingencyMode, string> = {
  pause_and_attend: "Pausa y Atención",
  parallel_effort: "Esfuerzo en Paralelo",
};

export const CONTINGENCY_MODE_DESCRIPTIONS: Record<ContingencyMode, string> = {
  pause_and_attend: "El proceso padre se congela hasta que la contingencia se resuelva.",
  parallel_effort: "El proceso padre continúa. La contingencia corre simultáneamente.",
};

export const CONTINGENCY_MODE_BADGE: Record<ContingencyMode, string> = {
  pause_and_attend: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  parallel_effort: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
};

export const CONTINGENCY_MODE_EMOJI: Record<ContingencyMode, string> = {
  pause_and_attend: "🔴",
  parallel_effort: "🔵",
};

export const CONTINGENCY_STATUS_LABELS: Record<ContingencyStatus, string> = {
  active: "Activa",
  completed: "Completada",
  cancelled: "Cancelada",
};

export const CONTINGENCY_STATUS_BADGE: Record<ContingencyStatus, string> = {
  active: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

/** Tiempo transcurrido legible desde una fecha ISO ("hace 3 días"). */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "recién";
  if (mins < 60) return `hace ${mins} ${mins === 1 ? "minuto" : "minutos"}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} ${hours === 1 ? "hora" : "horas"}`;
  const days = Math.floor(hours / 24);
  return `hace ${days} ${days === 1 ? "día" : "días"}`;
}

/** Roles autorizados a bifurcar un proceso por contingencia. */
export const CONTINGENCY_ROLES = ["admin", "gerente", "compras"] as const;

export function canManageContingencies(role?: string | null): boolean {
  return !!role && (CONTINGENCY_ROLES as readonly string[]).includes(role);
}
