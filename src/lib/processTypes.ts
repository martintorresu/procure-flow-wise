export type ProcessType = "compra" | "licitacion" | "contrato" | "permiso" | "obra" | "personalizado";

export const PROCESS_TYPES: ProcessType[] = [
  "compra",
  "licitacion",
  "contrato",
  "permiso",
  "obra",
  "personalizado",
];

export const PROCESS_TYPE_LABELS: Record<ProcessType, string> = {
  compra: "Compra",
  licitacion: "Licitación",
  contrato: "Contrato",
  permiso: "Permiso",
  obra: "Ejecución de Obra",
  personalizado: "Personalizado",
};

export const isPurchaseType = (t?: string | null): boolean => (t ?? "compra") === "compra";

/** True si el proceso usa el flujo preestablecido de Ejecución de Obra (10 etapas). */
export const isObraType = (t?: string | null): boolean => t === "obra";

/** Etapas preestablecidas del proceso "Ejecución de Obra" (con hito principal). */
export const OBRA_STAGES = [
  { key: "cierre_diseno", label: "Cierre de Diseño y Habilitación" },
  { key: "movilizacion", label: "Movilización e Instalación de Faena" },
  { key: "preliminares", label: "Obras Preliminares y Preparación del Terreno" },
  { key: "fundaciones", label: "Fundaciones y Subestructura" },
  { key: "obra_gruesa", label: "Obra Gruesa y Superestructura" },
  { key: "envolvente", label: "Envolvente y Cerramientos" },
  { key: "instalaciones", label: "Instalaciones y Especialidades" },
  { key: "terminaciones", label: "Terminaciones" },
  { key: "pruebas", label: "Pruebas, Puesta en Marcha y Preentrega" },
  { key: "recepcion_obra", label: "Recepción, Entrega y Postventa" },
] as const;

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
