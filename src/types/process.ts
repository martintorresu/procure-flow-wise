/** Nivel de acceso global del usuario (no es el cargo de la persona). */
export type UserRole = "admin" | "gestor" | "colaborador" | "lector";

export interface Process {
  id: string;
  process_number: string;
  title: string;
  description: string;
  /** Nombre del proyecto vinculado (join con projects). */
  project_name: string;
  current_owner: string;
  created_at: string;
  updated_at: string;
  /** Tenant dueño del proceso. */
  tenant_id?: string | null;

  /** Tipo de proceso: licitacion | contrato | obra | compra_industrial | personalizado. */
  process_type?: "licitacion" | "contrato" | "obra" | "compra_industrial" | "personalizado";
  /** Proyecto normalizado (tabla projects). */
  project_id?: string | null;
  /** Proceso del que este es continuación. */
  predecessor_process_id?: string | null;
  /** Id de la contingencia que mantiene pausado este proceso (Modo A). */
  paused_by_contingency?: string | null;
}

export interface Alert {
  id: string;
  process_id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  due_date?: string;
  resolved: boolean;
  created_at: string;
  /** Timestamp de lectura; null = no leída. */
  read_at?: string | null;
  /** Última modificación; se usa como proxy de fecha de resolución. */
  updated_at?: string | null;
  /** Timestamp de escalamiento; null = no escalada. */
  escalated_at?: string | null;
}


export interface NotificationPreferences {
  id: string;
  user_id: string;
  tenant_id: string;
  channel_inapp: boolean;
  channel_email: boolean;
  channel_whatsapp: boolean;
  quiet_start: string | null;
  quiet_end: string | null;
  quiet_enabled: boolean;
  email_grouping: 'immediate' | 'daily_digest';
  min_severity_email: string;
  min_severity_whatsapp: string;
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
