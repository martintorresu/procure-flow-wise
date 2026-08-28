import {
  FileText, Wrench, ClipboardList, FileSearch, Award, Truck,
  FlaskConical, Ship, MapPin, Check, type LucideIcon,
} from "lucide-react";

/**
 * Fuente única de verdad para las etapas de un proceso de compra.
 * - PURCHASE_STEPS: pasos del stepper (claves = PdcStatus del front).
 * - DB_STAGES: valores del enum `process_stage` en base de datos (edición admin).
 */

export interface PurchaseStep {
  key: string;
  label: string;
  icon: LucideIcon;
}

export const PURCHASE_STEPS: PurchaseStep[] = [
  { key: "draft", label: "Borrador", icon: FileText },
  { key: "technical_definition", label: "Técnica", icon: Wrench },
  { key: "planning", label: "Planificación", icon: ClipboardList },
  { key: "quotation", label: "Cotización", icon: FileSearch },
  { key: "evaluation", label: "Evaluación", icon: FileSearch },
  { key: "awarded", label: "Adjudicación", icon: Award },
  { key: "po_issued", label: "OC / Vendor", icon: Truck },
  { key: "drawings", label: "Planos", icon: ClipboardList },
  { key: "fat", label: "Prueba de Fábrica", icon: FlaskConical },
  { key: "shipping", label: "Logística", icon: Ship },
  { key: "arrived", label: "Arribado", icon: MapPin },
  { key: "closed", label: "Cerrado", icon: Check },
];

export const PURCHASE_STATUS_ORDER = PURCHASE_STEPS.map((s) => s.key);

/** Etapas persistidas en BD (enum `process_stage`), en orden de avance. */
export const DB_STAGES = [
  { value: "ingenieria", label: "Ingeniería" },
  { value: "programacion", label: "Programación / Planificación" },
  { value: "compras", label: "Compras" },
  { value: "licitacion", label: "Licitación" },
  { value: "evaluacion", label: "Evaluación" },
  { value: "orden_compra", label: "Orden de Compra" },
  { value: "seguimiento", label: "Seguimiento / FAT" },
  { value: "recepcion", label: "Recepción / Logística" },
] as const;

export type DbStageValue = typeof DB_STAGES[number]["value"];
