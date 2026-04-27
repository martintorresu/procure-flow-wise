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
  | "section_6";

export interface EtFormState {
  section_1: Record<string, unknown>; // Identificación
  section_2: Record<string, unknown>; // Descripción y alcance
  section_3: Record<string, unknown>[]; // Lista de equipos/items
  section_4: Record<string, unknown>; // Condiciones de operación / sitio
  section_5: Record<string, unknown>[]; // Documentos / planos requeridos
  section_6: Record<string, unknown>; // Observaciones y firmas
}

export const EMPTY_ET_FORM: EtFormState = {
  section_1: {},
  section_2: {},
  section_3: [],
  section_4: {},
  section_5: [],
  section_6: {},
};

export const SECTIONS: { key: EtSectionKey; label: string; description: string }[] = [
  { key: "section_1", label: "1. Identificación", description: "Datos generales del proceso" },
  { key: "section_2", label: "2. Descripción y Alcance", description: "Qué se necesita comprar y su propósito" },
  { key: "section_3", label: "3. Especificaciones Técnicas", description: "Lista de equipos con campos técnicos" },
  { key: "section_4", label: "4. Condiciones de Sitio", description: "Ambiente, instalación y operación" },
  { key: "section_5", label: "5. Documentación Requerida", description: "Planos, manuales y certificaciones" },
  { key: "section_6", label: "6. Observaciones", description: "Notas finales y aprobación" },
];
