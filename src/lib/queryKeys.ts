export interface ProcessFilters {
  projectId?: string;
  processType?: string;
}

/** Claves de caché centralizadas para TanStack Query. */
export const queryKeys = {
  processes: (filters?: ProcessFilters) => ["processes", filters ?? {}] as const,
  process: (id: string) => ["processes", id] as const,
  processStageSummaries: () => ["process-stage-summaries"] as const,
  alerts: () => ["alerts"] as const,
  alertRules: () => ["alert_rules"] as const,
  contingencies: () => ["contingencies"] as const,
  contingenciesByProcess: (processId: string) => ["contingencies", processId] as const,
} as const;
