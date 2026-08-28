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
  contrato: "Administración de Contrato",
  permiso: "Permiso",
  obra: "Ejecución de Obra",
  personalizado: "Personalizado",
};

export const isPurchaseType = (t?: string | null): boolean => (t ?? "compra") === "compra";

/** True si el proceso usa el flujo preestablecido de Ejecución de Obra (10 etapas). */
export const isObraType = (t?: string | null): boolean => t === "obra";

/** True si el proceso usa el flujo preestablecido de Licitación (10 etapas). */
export const isLicitacionType = (t?: string | null): boolean => t === "licitacion";

/** True si el proceso usa el flujo preestablecido de Administración de Contrato (10 etapas). */
export const isAdministracionContratoType = (t?: string | null): boolean => t === "contrato";

/** Etapas preestablecidas del proceso "Administración de Contrato". */
export const ADMINISTRACION_CONTRATO_STAGES = [
  { key: "formalizacion", label: "Formalización y Habilitación del Contrato" },
  { key: "inicio", label: "Inicio y Puesta en Marcha" },
  { key: "linea_base", label: "Planificación y Línea Base Contractual" },
  { key: "seguimiento_ejecucion", label: "Seguimiento de Ejecución y Avance" },
  { key: "estados_pago", label: "Medición, Estados de Pago y Facturación" },
  { key: "cambios", label: "Gestión de Cambios y Modificaciones" },
  { key: "incumplimientos", label: "Gestión de Incumplimientos, Riesgos y Controversias" },
  { key: "recepcion_servicio", label: "Recepción de la Obra o Servicio" },
  { key: "cierre_administrativo", label: "Cierre Administrativo y Financiero" },
  { key: "cierre_contractual", label: "Cierre Contractual y Garantías" },
] as const;

/** Etapas preestablecidas del proceso "Licitación" (con hito principal). */
export const LICITACION_STAGES = [
  { key: "definicion_requerimiento", label: "Definición del Requerimiento y Estrategia" },
  { key: "bases", label: "Preparación de Antecedentes y Bases" },
  { key: "precalificacion", label: "Precalificación de Oferentes" },
  { key: "convocatoria", label: "Convocatoria y Entrega de Antecedentes" },
  { key: "consultas", label: "Consultas, Aclaraciones y Modificaciones" },
  { key: "apertura", label: "Recepción y Apertura de Ofertas" },
  { key: "evaluacion_ofertas", label: "Evaluación Técnica y Comercial" },
  { key: "negociacion", label: "Aclaraciones Finales y Negociación" },
  { key: "adjudicacion", label: "Recomendación y Adjudicación" },
  { key: "contratacion", label: "Contratación y Habilitación" },
] as const;

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

/**
 * True si el proceso puede encadenarse con un proceso de continuación.
 * En el modelo de etapas actual siempre es posible encadenar.
 */
export function canChain(): boolean {
  return true;
}
