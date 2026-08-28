export type PdcStatus =
  | "draft"
  | "technical_definition"
  | "planning"
  | "quotation"
  | "evaluation"
  | "awarded"
  | "po_issued"
  | "drawings"
  | "fat"
  | "shipping"
  | "arrived"
  | "closed"
  | "closed_with_incident";

export type Criticality = "low" | "medium" | "high";
export type TrafficLight = "green" | "yellow" | "red";
export type UserRole = "admin" | "compras" | "ingenieria" | "programacion" | "gerente" | "planificacion" | "logistica";

export interface Pdc {
  id: string;
  pdc_number: string;
  project: string;
  title: string;
  description: string;
  category: string;
  criticality: Criticality;
  estimated_amount: number;
  currency: string;
  required_on_site_date: string;
  current_status: PdcStatus;
  current_owner: string;
  requesting_area?: string | null;
  selected_supplier?: string;
  created_at: string;
  updated_at: string;
  /** Etapa cruda del enum process_stage (BD). */
  current_stage?: string;
  /** Tenant dueño del proceso. */
  tenant_id?: string | null;

  /** Estado de aprobación cuando una regla bloqueó el avance. */
  approval_status?: "pending" | "approved" | "rejected" | null;
  approval_required_role?: string | null;
  approval_target_stage?: string | null;
  /** Tipo de proceso: compra | licitacion | contrato | permiso | personalizado. */
  process_type?: "compra" | "licitacion" | "contrato" | "permiso" | "personalizado";
  /** Proyecto normalizado (tabla projects). */
  project_id?: string | null;
  /** Proceso del que este es continuación. */
  predecessor_process_id?: string | null;
  /** Id de la contingencia que mantiene pausado este proceso (Modo A). */
  paused_by_contingency?: string | null;
}

export interface Alert {
  id: string;
  pdc_id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  due_date?: string;
  resolved: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** Slug del tenant al que pertenece el usuario (ej. "acme", "default") */
  tenantSlug: string;
  /** Id del tenant del perfil interno (null si no tiene perfil de tenant). */
  tenantId?: string | null;
  /** Teléfono en formato E.164 (ej: +56912345678). */
  phone?: string;
  /** RUT o identificador fiscal regional. */
  rut?: string;
  /** Preferencia de recibir alertas por WhatsApp. */
  whatsappNotificationsEnabled?: boolean;

}


export const STATUS_LABELS: Record<PdcStatus, string> = {
  draft: "Borrador",
  technical_definition: "Definición Técnica",
  planning: "Planificación",
  quotation: "Cotización",
  evaluation: "Evaluación",
  awarded: "Adjudicado",
  po_issued: "OC Emitida",
  drawings: "Planos",
  fat: "Prueba de Fábrica",
  shipping: "En Tránsito",
  arrived: "Arribado",
  closed: "Cerrado",
  closed_with_incident: "Cerrado c/Incidente",
};

export const CRITICALITY_LABELS: Record<Criticality, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};
