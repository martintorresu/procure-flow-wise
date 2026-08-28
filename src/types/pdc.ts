export type UserRole = "admin" | "compras" | "ingenieria" | "programacion" | "gerente" | "planificacion" | "logistica";

export interface Pdc {
  id: string;
  pdc_number: string;
  title: string;
  description: string;
  /** Nombre del proyecto vinculado (join con projects). */
  project_name: string;
  current_owner: string;
  created_at: string;
  updated_at: string;
  /** Tenant dueño del proceso. */
  tenant_id?: string | null;

  /** Tipo de proceso: compra | licitacion | contrato | permiso | obra | personalizado. */
  process_type?: "compra" | "licitacion" | "contrato" | "permiso" | "obra" | "personalizado";
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
