// Tipos del módulo Formulario de Especificaciones Técnicas (ET)

export type EtFieldType = "text" | "number" | "select" | "textarea" | "checkbox" | "date";

export interface EtFieldDef {
  key: string;
  label: string;
  type: EtFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  helpText?: string;
}

export type EtSectionKey =
  | "section_1"
  | "section_2"
  | "section_3"
  | "section_4"
  | "section_5"
  | "section_6"
  | "section_7"
  | "section_8";

export interface EtFormState {
  section_1: Record<string, unknown>; // Identificación + descripción
  section_2: Record<string, unknown>; // Datos de gestión de compra (criticidad, plazo, lugar)
  section_3: Record<string, unknown>[]; // Especificaciones técnicas (lista equipos)
  section_4: Record<string, unknown>; // Condiciones de sitio
  section_5: Record<string, unknown>[]; // Documentación / planos
  section_6: Record<string, unknown>; // Protocolo FAT
  section_7: Record<string, unknown>[]; // Accesorios y repuestos
  section_8: Record<string, unknown>; // Condiciones comerciales + observaciones
}

export const EMPTY_ET_FORM: EtFormState = {
  section_1: {},
  section_2: {},
  section_3: [],
  section_4: {},
  section_5: [],
  section_6: {},
  section_7: [],
  section_8: {},
};

export const SECTIONS: { key: EtSectionKey; label: string; description: string }[] = [
  { key: "section_1", label: "1. Identificación", description: "Datos generales y descripción del proceso" },
  { key: "section_2", label: "2. Gestión de Compra", description: "Criticidad, plazo y lugar de entrega" },
  { key: "section_3", label: "3. Especificaciones Técnicas", description: "Lista de equipos con campos técnicos" },
  { key: "section_4", label: "4. Condiciones de Sitio", description: "Ambiente, instalación y operación" },
  { key: "section_5", label: "5. Documentación Requerida", description: "Planos, manuales y certificaciones" },
  { key: "section_6", label: "6. Protocolo Prueba de Fábrica", description: "Pruebas en fábrica antes del despacho" },
  { key: "section_7", label: "7. Accesorios y Repuestos", description: "Componentes mínimos a incluir" },
  { key: "section_8", label: "8. Condiciones Comerciales", description: "Garantía, pago, plazos y observaciones" },
];

// Catálogos para campos enumerados
export const CRITICALITY_OPTIONS = ["alta", "media", "baja"] as const;
export const FAT_TEST_OPTIONS = [
  "Inspección visual",
  "Pruebas dieléctricas",
  "Medición de relación de transformación",
  "Resistencia de aislamiento",
  "Pruebas de calentamiento",
  "Pruebas de ruido",
  "Verificación dimensional",
  "Pruebas de funcionamiento",
] as const;
export const PAYMENT_TERMS_OPTIONS = [
  "30% anticipo / 70% contra entrega",
  "50% anticipo / 50% contra entrega",
  "100% contra entrega",
  "Carta de crédito",
  "Otro",
] as const;
export const INCOTERM_OPTIONS = ["EXW", "FCA", "FOB", "CIF", "CIP", "DAP", "DDP"] as const;
