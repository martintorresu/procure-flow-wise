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
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          position?: string | null
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      purchase_processes: {
        Row: {
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
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
