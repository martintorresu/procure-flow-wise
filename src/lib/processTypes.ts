export type ProcessType = "compra" | "licitacion" | "contrato" | "permiso" | "personalizado";

export const PROCESS_TYPES: ProcessType[] = [
  "compra",
  "licitacion",
  "contrato",
  "permiso",
  "personalizado",
];

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  compra: "Compra",
  licitacion: "Licitación",
  contrato: "Contrato",
  permiso: "Permiso",
  personalizado: "Personalizado",
};

export const isPurchaseType = (t?: string | null): boolean => (t ?? "compra") === "compra";

/** Etapas del stepper genérico (procesos que no son de compra). */
export const GENERIC_STAGES = [
  { key: "definicion", label: "Definición" },
  { key: "planificacion", label: "Planificación" },
  { key: "ejecucion", label: "Ejecución" },
  { key: "cierre", label: "Cierre" },
] as const;

/** Mapea la etapa de BD (process_stage) al índice del stepper genérico. */
export function genericStageIndex(dbStage?: string | null): number {
  switch (dbStage) {
    case "ingenieria":
      return 0;
    case "programacion":
      return 1;
    case "recepcion":
      return 3;
    case undefined:
    case null:
      return 0;
    default:
      return 2;
  }
}

/** True si el proceso está en una etapa natural de traspaso (permite encadenar). */
export function canChain(processType: string | null | undefined, dbStage?: string | null, status?: string): boolean {
  if (isPurchaseType(processType)) {
    return ["orden_compra", "seguimiento", "recepcion"].includes(dbStage ?? "")
      || ["awarded", "po_issued", "closed", "arrived", "shipping"].includes(status ?? "");
  }
  return genericStageIndex(dbStage) >= 2;
}
