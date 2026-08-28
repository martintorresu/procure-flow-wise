export interface PdcFilters {
  projectId?: string;
  processType?: string;
}

/** Claves de caché centralizadas para TanStack Query. */
export const queryKeys = {
  pdcs: (filters?: PdcFilters) => ["pdcs", filters ?? {}] as const,
  pdc: (id: string) => ["pdcs", id] as const,
  processStageSummaries: () => ["process-stage-summaries"] as const,
  alerts: () => ["alerts"] as const,
  alertRules: () => ["alert_rules"] as const,
  contingencies: () => ["contingencies"] as const,
  contingenciesByProcess: (processId: string) => ["contingencies", processId] as const,
} as const;
