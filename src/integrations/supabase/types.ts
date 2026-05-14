export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alert_rules: {
        Row: {
          active: boolean
          created_at: string
          id: string
          label: string
          severity: string
          tenant_id: string
          threshold_days: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          label: string
          severity: string
          tenant_id: string
          threshold_days?: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          label?: string
          severity?: string
          tenant_id?: string
          threshold_days?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          message: string
          owner_role: Database["public"]["Enums"]["app_role"] | null
          pdc_id: string | null
          resolved: boolean
          severity: string
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          message: string
          owner_role?: Database["public"]["Enums"]["app_role"] | null
          pdc_id?: string | null
          resolved?: boolean
          severity?: string
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          message?: string
          owner_role?: Database["public"]["Enums"]["app_role"] | null
          pdc_id?: string | null
          resolved?: boolean
          severity?: string
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_matrix: {
        Row: {
          active: boolean
          amount_threshold: number | null
          condition_type: string
          created_at: string
          criticality_level: Database["public"]["Enums"]["criticality"] | null
          id: string
          label: string
          required_role: Database["public"]["Enums"]["app_role"]
          stage: Database["public"]["Enums"]["process_stage"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_threshold?: number | null
          condition_type: string
          created_at?: string
          criticality_level?: Database["public"]["Enums"]["criticality"] | null
          id?: string
          label: string
          required_role: Database["public"]["Enums"]["app_role"]
          stage: Database["public"]["Enums"]["process_stage"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_threshold?: number | null
          condition_type?: string
          created_at?: string
          criticality_level?: Database["public"]["Enums"]["criticality"] | null
          id?: string
          label?: string
          required_role?: Database["public"]["Enums"]["app_role"]
          stage?: Database["public"]["Enums"]["process_stage"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_matrix_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drawings: {
        Row: {
          approved: boolean
          created_at: string
          created_by: string
          id: string
          pdc_id: string
          received_date: string | null
          requested_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved?: boolean
          created_at?: string
          created_by?: string
          id?: string
          pdc_id: string
          received_date?: string | null
          requested_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved?: boolean
          created_at?: string
          created_by?: string
          id?: string
          pdc_id?: string
          received_date?: string | null
          requested_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drawings_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drawings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_type_schemas: {
        Row: {
          code: string
          created_at: string
          description: string | null
          fields_schema: Json
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          fields_schema?: Json
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          fields_schema?: Json
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      et_audit_log: {
        Row: {
          action: string
          created_at: string
          details: string | null
          et_form_id: string
          id: string
          metadata: Json | null
          tenant_id: string
          user_area: string | null
          user_id: string | null
          user_name: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          et_form_id: string
          id?: string
          metadata?: Json | null
          tenant_id: string
          user_area?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          et_form_id?: string
          id?: string
          metadata?: Json | null
          tenant_id?: string
          user_area?: string | null
          user_id?: string | null
          user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "et_audit_log_et_form_id_fkey"
            columns: ["et_form_id"]
            isOneToOne: false
            referencedRelation: "et_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "et_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      et_form_data: {
        Row: {
          et_form_id: string
          id: string
          last_saved_at: string
          last_saved_by: string | null
          section_1: Json
          section_2: Json
          section_3: Json
          section_4: Json
          section_5: Json
          section_6: Json
          section_7: Json
          section_8: Json
          tenant_id: string
          updated_at: string
        }
        Insert: {
          et_form_id: string
          id?: string
          last_saved_at?: string
          last_saved_by?: string | null
          section_1?: Json
          section_2?: Json
          section_3?: Json
          section_4?: Json
          section_5?: Json
          section_6?: Json
          section_7?: Json
          section_8?: Json
          tenant_id: string
          updated_at?: string
        }
        Update: {
          et_form_id?: string
          id?: string
          last_saved_at?: string
          last_saved_by?: string | null
          section_1?: Json
          section_2?: Json
          section_3?: Json
          section_4?: Json
          section_5?: Json
          section_6?: Json
          section_7?: Json
          section_8?: Json
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "et_form_data_et_form_id_fkey"
            columns: ["et_form_id"]
            isOneToOne: true
            referencedRelation: "et_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "et_form_data_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      et_forms: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          completion_percentage: number
          created_at: string
          created_by: string
          equipment_type_code: string | null
          id: string
          process_id: string
          status: Database["public"]["Enums"]["et_status"]
          submitted_at: string | null
          submitted_by: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          completion_percentage?: number
          created_at?: string
          created_by: string
          equipment_type_code?: string | null
          id?: string
          process_id: string
          status?: Database["public"]["Enums"]["et_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          completion_percentage?: number
          created_at?: string
          created_by?: string
          equipment_type_code?: string | null
          id?: string
          process_id?: string
          status?: Database["public"]["Enums"]["et_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "et_forms_equipment_type_code_fkey"
            columns: ["equipment_type_code"]
            isOneToOne: false
            referencedRelation: "equipment_type_schemas"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "et_forms_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: true
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "et_forms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fat_events: {
        Row: {
          created_at: string
          created_by: string
          executed_date: string | null
          id: string
          pdc_id: string
          report_received: boolean
          result: string | null
          scheduled_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          executed_date?: string | null
          id?: string
          pdc_id: string
          report_received?: boolean
          result?: string | null
          scheduled_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          executed_date?: string | null
          id?: string
          pdc_id?: string
          report_received?: boolean
          result?: string | null
          scheduled_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fat_events_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fat_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_events: {
        Row: {
          chile_arrival_date: string | null
          created_at: string
          created_by: string
          damages_reported: boolean
          exwork_date: string | null
          id: string
          pdc_id: string
          port_arrival_date: string | null
          shipped_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          chile_arrival_date?: string | null
          created_at?: string
          created_by?: string
          damages_reported?: boolean
          exwork_date?: string | null
          id?: string
          pdc_id: string
          port_arrival_date?: string | null
          shipped_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          chile_arrival_date?: string | null
          created_at?: string
          created_by?: string
          damages_reported?: boolean
          exwork_date?: string | null
          id?: string
          pdc_id?: string
          port_arrival_date?: string | null
          shipped_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "logistics_events_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          position: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          position?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          position?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_milestones: {
        Row: {
          actual_date: string | null
          created_at: string
          created_by: string
          deviation_days: number
          id: string
          milestone_type: string
          pdc_id: string
          planned_date: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actual_date?: string | null
          created_at?: string
          created_by?: string
          deviation_days?: number
          id?: string
          milestone_type: string
          pdc_id: string
          planned_date: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actual_date?: string | null
          created_at?: string
          created_by?: string
          deviation_days?: number
          id?: string
          milestone_type?: string
          pdc_id?: string
          planned_date?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_milestones_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_milestones_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          accepted_date: string | null
          amount: number | null
          created_at: string
          created_by: string
          id: string
          issue_date: string | null
          pdc_id: string
          po_number: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_date?: string | null
          amount?: number | null
          created_at?: string
          created_by?: string
          id?: string
          issue_date?: string | null
          pdc_id: string
          po_number: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          accepted_date?: string | null
          amount?: number | null
          created_at?: string
          created_by?: string
          id?: string
          issue_date?: string | null
          pdc_id?: string
          po_number?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_processes: {
        Row: {
          approval_required_role: Database["public"]["Enums"]["app_role"] | null
          approval_status: string | null
          approval_target_stage:
            | Database["public"]["Enums"]["process_stage"]
            | null
          category: string | null
          created_at: string
          created_by: string
          criticality: Database["public"]["Enums"]["criticality"]
          currency: string | null
          current_stage: Database["public"]["Enums"]["process_stage"]
          description: string | null
          engineering_responsible: string | null
          estimated_amount: number | null
          et_document_code: string | null
          id: string
          name: string
          pdc_number: string
          project: string
          requesting_area: string | null
          required_on_site_date: string | null
          responsible_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          approval_required_role?:
            | Database["public"]["Enums"]["app_role"]
            | null
          approval_status?: string | null
          approval_target_stage?:
            | Database["public"]["Enums"]["process_stage"]
            | null
          category?: string | null
          created_at?: string
          created_by: string
          criticality?: Database["public"]["Enums"]["criticality"]
          currency?: string | null
          current_stage?: Database["public"]["Enums"]["process_stage"]
          description?: string | null
          engineering_responsible?: string | null
          estimated_amount?: number | null
          et_document_code?: string | null
          id?: string
          name: string
          pdc_number?: string
          project: string
          requesting_area?: string | null
          required_on_site_date?: string | null
          responsible_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          approval_required_role?:
            | Database["public"]["Enums"]["app_role"]
            | null
          approval_status?: string | null
          approval_target_stage?:
            | Database["public"]["Enums"]["process_stage"]
            | null
          category?: string | null
          created_at?: string
          created_by?: string
          criticality?: Database["public"]["Enums"]["criticality"]
          currency?: string | null
          current_stage?: Database["public"]["Enums"]["process_stage"]
          description?: string | null
          engineering_responsible?: string | null
          estimated_amount?: number | null
          et_document_code?: string | null
          id?: string
          name?: string
          pdc_number?: string
          project?: string
          requesting_area?: string | null
          required_on_site_date?: string | null
          responsible_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_processes_engineering_responsible_fkey"
            columns: ["engineering_responsible"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_processes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_suppliers: {
        Row: {
          commercial_score: number | null
          created_at: string
          created_by: string
          id: string
          lead_time_days: number | null
          quoted_amount: number | null
          rfq_id: string
          supplier_name: string
          technical_score: number | null
          tenant_id: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          commercial_score?: number | null
          created_at?: string
          created_by?: string
          id?: string
          lead_time_days?: number | null
          quoted_amount?: number | null
          rfq_id: string
          supplier_name: string
          technical_score?: number | null
          tenant_id: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          commercial_score?: number | null
          created_at?: string
          created_by?: string
          id?: string
          lead_time_days?: number | null
          quoted_amount?: number | null
          rfq_id?: string
          supplier_name?: string
          technical_score?: number | null
          tenant_id?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfq_suppliers_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          close_date: string | null
          created_at: string
          created_by: string
          id: string
          pdc_id: string
          sent_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          close_date?: string | null
          created_at?: string
          created_by?: string
          id?: string
          pdc_id: string
          sent_date?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          close_date?: string | null
          created_at?: string
          created_by?: string
          id?: string
          pdc_id?: string
          sent_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      technical_specs: {
        Row: {
          created_at: string
          created_by: string
          has_studies: boolean
          id: string
          pdc_id: string
          studies_available_date: string | null
          summary_description: string
          tenant_id: string
          updated_at: string
          validation_status: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          has_studies?: boolean
          id?: string
          pdc_id: string
          studies_available_date?: string | null
          summary_description: string
          tenant_id: string
          updated_at?: string
          validation_status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          has_studies?: boolean
          id?: string
          pdc_id?: string
          studies_available_date?: string | null
          summary_description?: string
          tenant_id?: string
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "technical_specs_pdc_id_fkey"
            columns: ["pdc_id"]
            isOneToOne: false
            referencedRelation: "purchase_processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technical_specs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_pdc_number: { Args: never; Returns: string }
      get_user_tenant_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      role_can_access_stage: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _stage: Database["public"]["Enums"]["process_stage"]
        }
        Returns: boolean
      }
      user_can_access_stage: {
        Args: {
          _stage: Database["public"]["Enums"]["process_stage"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "ingenieria"
        | "programacion"
        | "compras"
        | "gerente"
        | "planificacion"
        | "logistica"
      criticality: "alta" | "media" | "baja"
      et_status:
        | "borrador"
        | "incompleto"
        | "completo"
        | "en_revision"
        | "aprobado"
        | "rechazado"
        | "cerrado"
      process_stage:
        | "ingenieria"
        | "programacion"
        | "compras"
        | "licitacion"
        | "evaluacion"
        | "orden_compra"
        | "seguimiento"
        | "recepcion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "ingenieria",
        "programacion",
        "compras",
        "gerente",
        "planificacion",
        "logistica",
      ],
      criticality: ["alta", "media", "baja"],
      et_status: [
        "borrador",
        "incompleto",
        "completo",
        "en_revision",
        "aprobado",
        "rechazado",
        "cerrado",
      ],
      process_stage: [
        "ingenieria",
        "programacion",
        "compras",
        "licitacion",
        "evaluacion",
        "orden_compra",
        "seguimiento",
        "recepcion",
      ],
    },
  },
} as const
