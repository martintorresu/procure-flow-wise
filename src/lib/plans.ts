export type SubscriptionTier = "free" | "pro";

export interface PlanLimits {
  /** Máximo de procesos activos. null = ilimitado. */
  maxActiveProcesses: number | null;
  /** Máximo de usuarios del tenant. null = ilimitado. */
  maxUsers: number | null;
}

/** Configuración centralizada de límites por plan. */
export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  free: { maxActiveProcesses: 3, maxUsers: 2 },
  pro: { maxActiveProcesses: null, maxUsers: null },
};

export const PLAN_LABELS: Record<SubscriptionTier, string> = {
  free: "Free",
  pro: "Pro",
};

export const PROCESS_LIMIT_MESSAGE = `Has alcanzado el límite de ${PLAN_LIMITS.free.maxActiveProcesses} procesos en el plan Free. Contacta al administrador para actualizar a Pro.`;
export const USER_LIMIT_MESSAGE = `Límite de ${PLAN_LIMITS.free.maxUsers} usuarios en plan Free alcanzado.`;

/** Texto de uso, ej. "2/3 procesos" o "5 procesos". */
export function usageLabel(used: number, max: number | null, noun: string) {
  return max === null ? `${used} ${noun}` : `${used}/${max} ${noun}`;
}
