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
  milestones: (pdcId: string) => ["milestones", pdcId] as const,
  rfqs: (pdcId: string) => ["rfqs", pdcId] as const,
  purchaseOrders: (pdcId: string) => ["purchase_orders", pdcId] as const,
  drawings: (pdcId: string) => ["drawings", pdcId] as const,
  fatEvents: (pdcId: string) => ["fat_events", pdcId] as const,
  logisticsEvents: (pdcId: string) => ["logistics_events", pdcId] as const,
  alerts: () => ["alerts"] as const,
  alertRules: () => ["alert_rules"] as const,
  approvalMatrix: () => ["approval_matrix"] as const,
  etFieldSchema: (section?: number) => ["et_field_schema", section] as const,
  etFieldSchemas: () => ["et_field_schemas"] as const,
} as const;
