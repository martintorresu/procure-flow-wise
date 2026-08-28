import type { Criticality, PdcStatus } from "@/types/pdc";

export interface PdcFilters {
  project?: string;
  criticality?: Criticality;
  stage?: string;
  status?: PdcStatus;
}

/** Claves de caché centralizadas para TanStack Query. */
export const queryKeys = {
  pdcs: (filters?: PdcFilters) => ["pdcs", filters ?? {}] as const,
  pdc: (id: string) => ["pdcs", id] as const,
  alerts: () => ["alerts"] as const,
  alertRules: () => ["alert_rules"] as const,
  contingencies: () => ["contingencies"] as const,
  contingenciesByProcess: (processId: string) => ["contingencies", processId] as const,
} as const;
