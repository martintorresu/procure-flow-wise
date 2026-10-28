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
          escalated_at: string | null
          id: string
          message: string
          owner_role: Database["public"]["Enums"]["app_role"] | null
          process_id: string | null
          read_at: string | null
          resolved: boolean
          severity: string
          source_ref: Json | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          escalated_at?: string | null
          id?: string
          message: string
          owner_role?: Database["public"]["Enums"]["app_role"] | null
          process_id?: string | null
          read_at?: string | null
          resolved?: boolean
          severity?: string
          source_ref?: Json | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          escalated_at?: string | null
          id?: string
          message?: string
          owner_role?: Database["public"]["Enums"]["app_role"] | null
          process_id?: string | null
          read_at?: string | null
          resolved?: boolean
          severity?: string
          source_ref?: Json | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
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
      api_keys: {
        Row: {
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          key_hash: string
          key_prefix: string | null
          last_used_at: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          key_hash: string
          key_prefix?: string | null
          last_used_at?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          key_hash?: string
          key_prefix?: string | null
          last_used_at?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      applicability_rules: {
        Row: {
          action: string
          active: boolean
          condition_json: Json
          created_at: string
          explanation: string | null
          human_validation_required: boolean
          id: string
          priority: number
          requirement_code: string
          rule_group: string | null
          rule_id: string
          updated_at: string
        }
        Insert: {
          action?: string
          active?: boolean
          condition_json?: Json
          created_at?: string
          explanation?: string | null
          human_validation_required?: boolean
          id?: string
          priority?: number
          requirement_code: string
          rule_group?: string | null
          rule_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          active?: boolean
          condition_json?: Json
          created_at?: string
          explanation?: string | null
          human_validation_required?: boolean
          id?: string
          priority?: number
          requirement_code?: string
          rule_group?: string | null
          rule_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_rules: {
        Row: {
          accion_sistema: string
          code: string
          condicion: string
          created_at: string
          id: string
          sort_order: number
          tenant_id: string
        }
        Insert: {
          accion_sistema: string
          code: string
          condicion: string
          created_at?: string
          id?: string
          sort_order: number
          tenant_id: string
        }
        Update: {
          accion_sistema?: string
          code?: string
          condicion?: string
          created_at?: string
          id?: string
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      dom_process_steps: {
        Row: {
          activity: string
          code: string
          created_at: string
          evidence: string | null
          gate_code: string | null
          gate_question: string | null
          gate_route_no: string | null
          gate_route_si: string | null
          id: string
          responsible_role: string | null
          sort_order: number
          stage_name: string
          stage_number: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activity: string
          code: string
          created_at?: string
          evidence?: string | null
          gate_code?: string | null
          gate_question?: string | null
          gate_route_no?: string | null
          gate_route_si?: string | null
          id?: string
          responsible_role?: string | null
          sort_order: number
          stage_name: string
          stage_number: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activity?: string
          code?: string
          created_at?: string
          evidence?: string | null
          gate_code?: string | null
          gate_question?: string | null
          gate_route_no?: string | null
          gate_route_si?: string | null
          id?: string
          responsible_role?: string | null
          sort_order?: number
          stage_name?: string
          stage_number?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          alert_id: string | null
          created_at: string
          email: string
          error_message: string | null
          id: string
          status: string
          subject: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          email: string
          error_message?: string | null
          id?: string
          status?: string
          subject: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          email?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      escalation_rules: {
        Row: {
          active: boolean
          created_at: string
          escalation_hours: number
          id: string
          notify_manager: boolean
          re_notify_assignee: boolean
          severity: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          escalation_hours?: number
          id?: string
          notify_manager?: boolean
          re_notify_assignee?: boolean
          severity: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          escalation_hours?: number
          id?: string
          notify_manager?: boolean
          re_notify_assignee?: boolean
          severity?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      external_contacts: {
        Row: {
          company: string | null
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_gate_reviews: {
        Row: {
          answer: string
          created_at: string
          created_by: string | null
          gate_id: string
          id: string
          notes: string | null
          project_id: string
          reviewed_at: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          created_by?: string | null
          gate_id: string
          id?: string
          notes?: string | null
          project_id: string
          reviewed_at?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          created_by?: string | null
          gate_id?: string
          id?: string
          notes?: string | null
          project_id?: string
          reviewed_at?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "flow_gate_reviews_gate_id_fkey"
            columns: ["gate_id"]
            isOneToOne: false
            referencedRelation: "flow_gates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_gate_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_gate_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_gates: {
        Row: {
          code: string
          created_at: string
          flow_stage_id: string
          id: string
          question: string | null
          route_no: string | null
          route_yes: string | null
          sort_order: number
        }
        Insert: {
          code: string
          created_at?: string
          flow_stage_id: string
          id?: string
          question?: string | null
          route_no?: string | null
          route_yes?: string | null
          sort_order?: number
        }
        Update: {
          code?: string
          created_at?: string
          flow_stage_id?: string
          id?: string
          question?: string | null
          route_no?: string | null
          route_yes?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "flow_gates_flow_stage_id_fkey"
            columns: ["flow_stage_id"]
            isOneToOne: false
            referencedRelation: "flow_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_stages: {
        Row: {
          client_labels: string[]
          code: string
          created_at: string
          default_process_codes: string[]
          id: string
          name: string
          sort_order: number
        }
        Insert: {
          client_labels?: string[]
          code: string
          created_at?: string
          default_process_codes?: string[]
          id?: string
          name: string
          sort_order: number
        }
        Update: {
          client_labels?: string[]
          code?: string
          created_at?: string
          default_process_codes?: string[]
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      import_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          created_count: number
          error_count: number
          file_name: string | null
          id: string
          kind: string
          project_id: string | null
          skipped_count: number
          status: string
          target_table: string | null
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          updated_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_count?: number
          error_count?: number
          file_name?: string | null
          id?: string
          kind: string
          project_id?: string | null
          skipped_count?: number
          status?: string
          target_table?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_count?: number
          error_count?: number
          file_name?: string | null
          id?: string
          kind?: string
          project_id?: string | null
          skipped_count?: number
          status?: string
          target_table?: string | null
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          updated_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_rows: {
        Row: {
          created_at: string
          data: Json
          error: string | null
          id: string
          job_id: string
          record_code: string | null
          result: string | null
          row_number: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          data: Json
          error?: string | null
          id?: string
          job_id: string
          record_code?: string | null
          result?: string | null
          row_number: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          error?: string | null
          id?: string
          job_id?: string
          record_code?: string | null
          result?: string | null
          row_number?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_rows_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_rows_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_catalog_log: {
        Row: {
          action: string
          changed_at: string
          changed_by: string | null
          code: string
          id: string
          new_effective_to: string | null
          new_status: string | null
          old_effective_to: string | null
          old_status: string | null
          record_id: string
          table_name: string
          version_major: number | null
          version_minor: number | null
        }
        Insert: {
          action: string
          changed_at?: string
          changed_by?: string | null
          code: string
          id?: string
          new_effective_to?: string | null
          new_status?: string | null
          old_effective_to?: string | null
          old_status?: string | null
          record_id: string
          table_name: string
          version_major?: number | null
          version_minor?: number | null
        }
        Update: {
          action?: string
          changed_at?: string
          changed_by?: string | null
          code?: string
          id?: string
          new_effective_to?: string | null
          new_status?: string | null
          old_effective_to?: string | null
          old_status?: string | null
          record_id?: string
          table_name?: string
          version_major?: number | null
          version_minor?: number | null
        }
        Relationships: []
      }
      legal_processes: {
        Row: {
          applicability_text: string | null
          catalog_status: string
          catalog_version: string | null
          created_at: string
          default_flow_stage: string | null
          effective_from: string | null
          effective_to: string | null
          family: string | null
          id: string
          legal_nature: string | null
          name: string
          output_document: string | null
          process_code: string
          recipient: string | null
          updated_at: string
          version_major: number
          version_minor: number
        }
        Insert: {
          applicability_text?: string | null
          catalog_status?: string
          catalog_version?: string | null
          created_at?: string
          default_flow_stage?: string | null
          effective_from?: string | null
          effective_to?: string | null
          family?: string | null
          id?: string
          legal_nature?: string | null
          name: string
          output_document?: string | null
          process_code: string
          recipient?: string | null
          updated_at?: string
          version_major?: number
          version_minor?: number
        }
        Update: {
          applicability_text?: string | null
          catalog_status?: string
          catalog_version?: string | null
          created_at?: string
          default_flow_stage?: string | null
          effective_from?: string | null
          effective_to?: string | null
          family?: string | null
          id?: string
          legal_nature?: string | null
          name?: string
          output_document?: string | null
          process_code?: string
          recipient?: string | null
          updated_at?: string
          version_major?: number
          version_minor?: number
        }
        Relationships: []
      }
      legal_requirements: {
        Row: {
          allows_override: boolean
          applicability_text: string | null
          catalog_status: string
          catalog_version: string | null
          created_at: string
          default_priority: string | null
          effective_from: string | null
          effective_to: string | null
          evidence_pending: boolean
          evidence_required: string | null
          family: string | null
          group_code: string | null
          group_name: string | null
          id: string
          is_customizable: boolean
          issuer: string | null
          legal_nature: string | null
          legal_reference: string | null
          output_document: string | null
          process_code: string
          recipient: string | null
          requirement_code: string
          requirement_level: string | null
          requirement_name: string
          source_document: string | null
          source_version: string | null
          updated_at: string
          version_major: number
          version_minor: number
        }
        Insert: {
          allows_override?: boolean
          applicability_text?: string | null
          catalog_status?: string
          catalog_version?: string | null
          created_at?: string
          default_priority?: string | null
          effective_from?: string | null
          effective_to?: string | null
          evidence_pending?: boolean
          evidence_required?: string | null
          family?: string | null
          group_code?: string | null
          group_name?: string | null
          id?: string
          is_customizable?: boolean
          issuer?: string | null
          legal_nature?: string | null
          legal_reference?: string | null
          output_document?: string | null
          process_code: string
          recipient?: string | null
          requirement_code: string
          requirement_level?: string | null
          requirement_name: string
          source_document?: string | null
          source_version?: string | null
          updated_at?: string
          version_major?: number
          version_minor?: number
        }
        Update: {
          allows_override?: boolean
          applicability_text?: string | null
          catalog_status?: string
          catalog_version?: string | null
          created_at?: string
          default_priority?: string | null
          effective_from?: string | null
          effective_to?: string | null
          evidence_pending?: boolean
          evidence_required?: string | null
          family?: string | null
          group_code?: string | null
          group_name?: string | null
          id?: string
          is_customizable?: boolean
          issuer?: string | null
          legal_nature?: string | null
          legal_reference?: string | null
          output_document?: string | null
          process_code?: string
          recipient?: string | null
          requirement_code?: string
          requirement_level?: string | null
          requirement_name?: string
          source_document?: string | null
          source_version?: string | null
          updated_at?: string
          version_major?: number
          version_minor?: number
        }
        Relationships: []
      }
      minuta_participants: {
        Row: {
          created_at: string
          guest_company: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          is_guest: boolean
          meeting_session_id: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          guest_company?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean
          meeting_session_id: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          guest_company?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          is_guest?: boolean
          meeting_session_id?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "minuta_participants_meeting_session_id_fkey"
            columns: ["meeting_session_id"]
            isOneToOne: false
            referencedRelation: "minuta_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      minuta_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          meeting_date: string
          process_id: string | null
          process_stage_id: string | null
          project_id: string | null
          quality_score: number
          status: string
          tenant_id: string
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date: string
          process_id?: string | null
          process_stage_id?: string | null
          project_id?: string | null
          quality_score?: number
          status?: string
          tenant_id: string
          title: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          meeting_date?: string
          process_id?: string | null
          process_stage_id?: string | null
          project_id?: string | null
          quality_score?: number
          status?: string
          tenant_id?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "minuta_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_sessions_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_sessions_process_stage_id_fkey"
            columns: ["process_stage_id"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "minuta_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      municipal_requirements: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          effective_from: string | null
          effective_to: string | null
          evidence_required: string | null
          flow_stage_code: string | null
          id: string
          issuer: string | null
          legal_requirement_id: string | null
          mapping_status: string
          municipality_id: string
          name: string
          process_code: string | null
          proposed_shared: boolean
          requirement_type: string
          source: string
          status: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          evidence_required?: string | null
          flow_stage_code?: string | null
          id?: string
          issuer?: string | null
          legal_requirement_id?: string | null
          mapping_status?: string
          municipality_id: string
          name: string
          process_code?: string | null
          proposed_shared?: boolean
          requirement_type: string
          source: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          evidence_required?: string | null
          flow_stage_code?: string | null
          id?: string
          issuer?: string | null
          legal_requirement_id?: string | null
          mapping_status?: string
          municipality_id?: string
          name?: string
          process_code?: string | null
          proposed_shared?: boolean
          requirement_type?: string
          source?: string
          status?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "municipal_requirements_legal_requirement_id_fkey"
            columns: ["legal_requirement_id"]
            isOneToOne: false
            referencedRelation: "legal_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_requirements_legal_requirement_id_fkey"
            columns: ["legal_requirement_id"]
            isOneToOne: false
            referencedRelation: "legal_requirements_current"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_requirements_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "municipal_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      municipalities: {
        Row: {
          comuna_code: string
          contact: string | null
          created_at: string
          dom_name: string | null
          id: string
          intake_channel: string | null
          name: string
          region: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          comuna_code: string
          contact?: string | null
          created_at?: string
          dom_name?: string | null
          id?: string
          intake_channel?: string | null
          name: string
          region?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          comuna_code?: string
          contact?: string | null
          created_at?: string
          dom_name?: string | null
          id?: string
          intake_channel?: string | null
          name?: string
          region?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel_email: boolean
          channel_inapp: boolean
          channel_whatsapp: boolean
          created_at: string
          email_grouping: string
          id: string
          min_severity_email: string
          min_severity_whatsapp: string
          quiet_enabled: boolean
          quiet_end: string | null
          quiet_start: string | null
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_email?: boolean
          channel_inapp?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          email_grouping?: string
          id?: string
          min_severity_email?: string
          min_severity_whatsapp?: string
          quiet_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_email?: boolean
          channel_inapp?: boolean
          channel_whatsapp?: boolean
          created_at?: string
          email_grouping?: string
          id?: string
          min_severity_email?: string
          min_severity_whatsapp?: string
          quiet_enabled?: boolean
          quiet_end?: string | null
          quiet_start?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      positions: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          process_type: string | null
          sort_order: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          process_type?: string | null
          sort_order?: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          process_type?: string | null
          sort_order?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      process_applicability_rules: {
        Row: {
          applicability: string | null
          catalog_status: string
          condition_json: Json
          created_at: string
          effective_from: string | null
          effective_to: string | null
          explanation: string | null
          id: string
          process_code: string
          updated_at: string
          version_major: number
          version_minor: number
        }
        Insert: {
          applicability?: string | null
          catalog_status?: string
          condition_json?: Json
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          explanation?: string | null
          id?: string
          process_code: string
          updated_at?: string
          version_major?: number
          version_minor?: number
        }
        Update: {
          applicability?: string | null
          catalog_status?: string
          condition_json?: Json
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          explanation?: string | null
          id?: string
          process_code?: string
          updated_at?: string
          version_major?: number
          version_minor?: number
        }
        Relationships: []
      }
      process_comments: {
        Row: {
          author_user_id: string
          body: string
          created_at: string
          id: string
          process_id: string
          tenant_id: string
        }
        Insert: {
          author_user_id: string
          body: string
          created_at?: string
          id?: string
          process_id: string
          tenant_id: string
        }
        Update: {
          author_user_id?: string
          body?: string
          created_at?: string
          id?: string
          process_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_comments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      process_commitments: {
        Row: {
          activity_ref: string | null
          commitment_text: string
          created_at: string
          created_by: string | null
          due_date: string | null
          id: string
          meeting_date: string | null
          meeting_session_id: string | null
          meeting_title: string | null
          notes: string | null
          priority: string | null
          process_id: string | null
          raw_json: Json | null
          responsible_name: string | null
          responsible_user_id: string | null
          source: string
          stage_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activity_ref?: string | null
          commitment_text: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          meeting_date?: string | null
          meeting_session_id?: string | null
          meeting_title?: string | null
          notes?: string | null
          priority?: string | null
          process_id?: string | null
          raw_json?: Json | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          source?: string
          stage_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activity_ref?: string | null
          commitment_text?: string
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          id?: string
          meeting_date?: string | null
          meeting_session_id?: string | null
          meeting_title?: string | null
          notes?: string | null
          priority?: string | null
          process_id?: string | null
          raw_json?: Json | null
          responsible_name?: string | null
          responsible_user_id?: string | null
          source?: string
          stage_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_commitments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_commitments_meeting_session_id_fkey"
            columns: ["meeting_session_id"]
            isOneToOne: false
            referencedRelation: "minuta_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_commitments_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_commitments_responsible_user_id_fkey"
            columns: ["responsible_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_commitments_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_commitments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      process_contingencies: {
        Row: {
          child_process_id: string
          completed_at: string | null
          created_at: string
          created_by: string
          execution_mode: string
          id: string
          parent_process_id: string
          reason: string
          status: string
          tenant_id: string
        }
        Insert: {
          child_process_id: string
          completed_at?: string | null
          created_at?: string
          created_by: string
          execution_mode: string
          id?: string
          parent_process_id: string
          reason: string
          status?: string
          tenant_id: string
        }
        Update: {
          child_process_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string
          execution_mode?: string
          id?: string
          parent_process_id?: string
          reason?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_contingencies_child_process_id_fkey"
            columns: ["child_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_contingencies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_contingencies_parent_process_id_fkey"
            columns: ["parent_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_contingencies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      process_documents: {
        Row: {
          category: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          process_id: string
          tenant_id: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number
          file_type: string
          id?: string
          process_id: string
          tenant_id: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          process_id?: string
          tenant_id?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_documents_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      process_participants: {
        Row: {
          accepted_at: string | null
          email: string | null
          external_company: string | null
          external_role: string
          id: string
          invited_at: string
          invited_by: string | null
          permission_level: string
          position_id: string | null
          process_id: string
          status: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          email?: string | null
          external_company?: string | null
          external_role?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          permission_level?: string
          position_id?: string | null
          process_id: string
          status?: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          email?: string | null
          external_company?: string | null
          external_role?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          permission_level?: string
          position_id?: string | null
          process_id?: string
          status?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "process_participants_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_participants_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      process_stages: {
        Row: {
          activities: Json
          actual_end: string | null
          actual_start: string | null
          created_at: string
          description: string | null
          external_entity: string | null
          id: string
          name: string
          planned_end: string | null
          planned_start: string | null
          process_id: string
          responsible_name: string | null
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activities?: Json
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          description?: string | null
          external_entity?: string | null
          id?: string
          name: string
          planned_end?: string | null
          planned_start?: string | null
          process_id: string
          responsible_name?: string | null
          sort_order: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activities?: Json
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          description?: string | null
          external_entity?: string | null
          id?: string
          name?: string
          planned_end?: string | null
          planned_start?: string | null
          process_id?: string
          responsible_name?: string | null
          sort_order?: number
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "process_stages_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "process_stages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processes: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          paused_by_contingency: string | null
          predecessor_process_id: string | null
          process_number: string
          process_type: string
          project_id: string | null
          responsible_name: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          paused_by_contingency?: string | null
          predecessor_process_id?: string | null
          process_number: string
          process_type?: string
          project_id?: string | null
          responsible_name?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          paused_by_contingency?: string | null
          predecessor_process_id?: string | null
          process_number?: string
          process_type?: string
          project_id?: string | null
          responsible_name?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_processes_paused_by_contingency_fkey"
            columns: ["paused_by_contingency"]
            isOneToOne: false
            referencedRelation: "process_contingencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_processes_predecessor_process_id_fkey"
            columns: ["predecessor_process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      profile_contacts: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          rut: string | null
          updated_at: string
          whatsapp_notifications_enabled: boolean
        }
        Insert: {
          created_at?: string
          id: string
          phone?: string | null
          rut?: string | null
          updated_at?: string
          whatsapp_notifications_enabled?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          rut?: string | null
          updated_at?: string
          whatsapp_notifications_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profile_contacts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area: string | null
          created_at: string
          default_position_id: string | null
          email: string
          full_name: string | null
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          created_at?: string
          default_position_id?: string | null
          email: string
          full_name?: string | null
          id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          created_at?: string
          default_position_id?: string | null
          email?: string
          full_name?: string | null
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_position_id_fkey"
            columns: ["default_position_id"]
            isOneToOne: false
            referencedRelation: "positions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_processes: {
        Row: {
          active: boolean
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          process_code: string
          project_id: string
          suggested: boolean
          suggestion_explanation: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          process_code: string
          project_id: string
          suggested?: boolean
          suggestion_explanation?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          process_code?: string
          project_id?: string
          suggested?: boolean
          suggestion_explanation?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_processes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_processes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requirement_items: {
        Row: {
          activation_mode: string
          applicability: string
          closed_at: string | null
          code: string
          corrective_action: string | null
          created_at: string
          created_by: string | null
          due_date: string | null
          evidence_pending: boolean
          evidence_required: string | null
          flow_stage_id: string | null
          folio: string | null
          fulfilled_at: string | null
          id: string
          justification: string | null
          legal_reference: string | null
          link_url: string | null
          mapping_status: string
          name: string
          notes: string | null
          observation_reason: string | null
          origin_id: string | null
          origin_type: string
          origin_version: string | null
          owner_name: string | null
          owner_user_id: string | null
          priority: string | null
          process_code: string | null
          process_id: string | null
          project_id: string
          rule_explanation: string | null
          rule_id: string | null
          stage_id: string | null
          status: string | null
          suggested_code: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activation_mode: string
          applicability?: string
          closed_at?: string | null
          code: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          evidence_pending?: boolean
          evidence_required?: string | null
          flow_stage_id?: string | null
          folio?: string | null
          fulfilled_at?: string | null
          id?: string
          justification?: string | null
          legal_reference?: string | null
          link_url?: string | null
          mapping_status?: string
          name: string
          notes?: string | null
          observation_reason?: string | null
          origin_id?: string | null
          origin_type: string
          origin_version?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          priority?: string | null
          process_code?: string | null
          process_id?: string | null
          project_id: string
          rule_explanation?: string | null
          rule_id?: string | null
          stage_id?: string | null
          status?: string | null
          suggested_code?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activation_mode?: string
          applicability?: string
          closed_at?: string | null
          code?: string
          corrective_action?: string | null
          created_at?: string
          created_by?: string | null
          due_date?: string | null
          evidence_pending?: boolean
          evidence_required?: string | null
          flow_stage_id?: string | null
          folio?: string | null
          fulfilled_at?: string | null
          id?: string
          justification?: string | null
          legal_reference?: string | null
          link_url?: string | null
          mapping_status?: string
          name?: string
          notes?: string | null
          observation_reason?: string | null
          origin_id?: string | null
          origin_type?: string
          origin_version?: string | null
          owner_name?: string | null
          owner_user_id?: string | null
          priority?: string | null
          process_code?: string | null
          process_id?: string | null
          project_id?: string
          rule_explanation?: string | null
          rule_id?: string | null
          stage_id?: string | null
          status?: string | null
          suggested_code?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_requirement_items_flow_stage_id_fkey"
            columns: ["flow_stage_id"]
            isOneToOne: false
            referencedRelation: "flow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirement_items_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirement_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirement_items_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "process_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirement_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_requirements: {
        Row: {
          applicability: string
          created_at: string
          criterio_cierre: string | null
          evidencia_url: string | null
          fecha_objetivo: string | null
          fundamento: string | null
          id: string
          process_id: string
          requirement_catalog_id: string
          responsible_name: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          applicability?: string
          created_at?: string
          criterio_cierre?: string | null
          evidencia_url?: string | null
          fecha_objetivo?: string | null
          fundamento?: string | null
          id?: string
          process_id: string
          requirement_catalog_id: string
          responsible_name?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          applicability?: string
          created_at?: string
          criterio_cierre?: string | null
          evidencia_url?: string | null
          fecha_objetivo?: string | null
          fundamento?: string | null
          id?: string
          process_id?: string
          requirement_catalog_id?: string
          responsible_name?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_requirements_process_id_fkey"
            columns: ["process_id"]
            isOneToOne: false
            referencedRelation: "processes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirements_requirement_catalog_id_fkey"
            columns: ["requirement_catalog_id"]
            isOneToOne: false
            referencedRelation: "requirement_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          municipality_id: string | null
          name: string
          profile: Json
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          municipality_id?: string | null
          name: string
          profile?: Json
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          municipality_id?: string | null
          name?: string
          profile?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_municipality_id_fkey"
            columns: ["municipality_id"]
            isOneToOne: false
            referencedRelation: "municipalities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_catalog: {
        Row: {
          activity: string
          code: string
          created_at: string
          evidence: string | null
          gate_code: string | null
          gate_question: string | null
          gate_route_no: string | null
          gate_route_si: string | null
          id: string
          responsible_role: string | null
          sort_order: number
          stage_name: string
          stage_number: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activity: string
          code: string
          created_at?: string
          evidence?: string | null
          gate_code?: string | null
          gate_question?: string | null
          gate_route_no?: string | null
          gate_route_si?: string | null
          id?: string
          responsible_role?: string | null
          sort_order: number
          stage_name: string
          stage_number: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activity?: string
          code?: string
          created_at?: string
          evidence?: string | null
          gate_code?: string | null
          gate_question?: string | null
          gate_route_no?: string | null
          gate_route_si?: string | null
          id?: string
          responsible_role?: string | null
          sort_order?: number
          stage_name?: string
          stage_number?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_catalog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_documents: {
        Row: {
          created_at: string
          created_by: string | null
          document_type: string | null
          expires_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          folio: string | null
          id: string
          is_current: boolean
          issued_at: string | null
          issuer: string | null
          mime_type: string | null
          project_requirement_id: string
          replaces_id: string | null
          review_status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          expires_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          folio?: string | null
          id?: string
          is_current?: boolean
          issued_at?: string | null
          issuer?: string | null
          mime_type?: string | null
          project_requirement_id: string
          replaces_id?: string | null
          review_status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          document_type?: string | null
          expires_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          folio?: string | null
          id?: string
          is_current?: boolean
          issued_at?: string | null
          issuer?: string | null
          mime_type?: string | null
          project_requirement_id?: string
          replaces_id?: string | null
          review_status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "requirement_documents_project_requirement_id_fkey"
            columns: ["project_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirement_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_documents_replaces_id_fkey"
            columns: ["replaces_id"]
            isOneToOne: false
            referencedRelation: "requirement_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_events: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          field: string | null
          id: string
          justification: string | null
          new_value: Json | null
          old_value: Json | null
          project_id: string | null
          project_requirement_id: string | null
          rule_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          field?: string | null
          id?: string
          justification?: string | null
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string | null
          project_requirement_id?: string | null
          rule_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          field?: string | null
          id?: string
          justification?: string | null
          new_value?: Json | null
          old_value?: Json | null
          project_id?: string | null
          project_requirement_id?: string | null
          rule_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_events_project_requirement_id_fkey"
            columns: ["project_requirement_id"]
            isOneToOne: false
            referencedRelation: "project_requirement_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_template_items: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          origin_id: string
          origin_type: string
          sort_order: number
          template_id: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          origin_id: string
          origin_type: string
          sort_order?: number
          template_id: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          origin_id?: string
          origin_type?: string
          sort_order?: number
          template_id?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "requirement_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_template_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      requirement_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          project_type: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          project_type?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          project_type?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirement_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_certificates: {
        Row: {
          antecedente: string | null
          base_normativa: string | null
          certificate_id: string
          codigo: string | null
          condicion: string | null
          created_at: string
          documento_emitido: string | null
          emisor: string | null
          especialidad: string | null
          etapa_asociada: string | null
          id: string
        }
        Insert: {
          antecedente?: string | null
          base_normativa?: string | null
          certificate_id: string
          codigo?: string | null
          condicion?: string | null
          created_at?: string
          documento_emitido?: string | null
          emisor?: string | null
          especialidad?: string | null
          etapa_asociada?: string | null
          id?: string
        }
        Update: {
          antecedente?: string | null
          base_normativa?: string | null
          certificate_id?: string
          codigo?: string | null
          condicion?: string | null
          created_at?: string
          documento_emitido?: string | null
          emisor?: string | null
          especialidad?: string | null
          etapa_asociada?: string | null
          id?: string
        }
        Relationships: []
      }
      tenant_requirements: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          customized_at: string | null
          customized_by: string | null
          description: string | null
          evidence_required: string | null
          flow_stage_id: string | null
          id: string
          issuer: string | null
          legal_reference: string | null
          name: string
          origin_code: string | null
          origin_id: string | null
          origin_legal_reference: string | null
          origin_type: string | null
          origin_version: string | null
          process_code: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          customized_at?: string | null
          customized_by?: string | null
          description?: string | null
          evidence_required?: string | null
          flow_stage_id?: string | null
          id?: string
          issuer?: string | null
          legal_reference?: string | null
          name: string
          origin_code?: string | null
          origin_id?: string | null
          origin_legal_reference?: string | null
          origin_type?: string | null
          origin_version?: string | null
          process_code?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          customized_at?: string | null
          customized_by?: string | null
          description?: string | null
          evidence_required?: string | null
          flow_stage_id?: string | null
          id?: string
          issuer?: string | null
          legal_reference?: string | null
          name?: string
          origin_code?: string | null
          origin_id?: string | null
          origin_legal_reference?: string | null
          origin_type?: string | null
          origin_version?: string | null
          process_code?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_requirements_flow_stage_id_fkey"
            columns: ["flow_stage_id"]
            isOneToOne: false
            referencedRelation: "flow_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_requirements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_settings: {
        Row: {
          created_at: string
          id: string
          minuta_max_delivery_days: number
          minuta_quality_threshold: number
          minuta_start_scope: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          minuta_max_delivery_days?: number
          minuta_quality_threshold?: number
          minuta_start_scope?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          minuta_max_delivery_days?: number
          minuta_quality_threshold?: number
          minuta_start_scope?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
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
          subscription_tier: string
          subscription_updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          subscription_tier?: string
          subscription_updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          subscription_tier?: string
          subscription_updated_at?: string
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
      whatsapp_config: {
        Row: {
          access_token: string
          business_account_id: string
          created_at: string
          enabled: boolean
          id: string
          phone_number_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          business_account_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          phone_number_id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          business_account_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          phone_number_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_log: {
        Row: {
          alert_id: string | null
          created_at: string
          error_message: string | null
          id: string
          meta_message_id: string | null
          phone: string | null
          status: string
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          meta_message_id?: string | null
          phone?: string | null
          status: string
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          meta_message_id?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_log_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      legal_processes_current: {
        Row: {
          applicability_text: string | null
          catalog_status: string | null
          catalog_version: string | null
          created_at: string | null
          default_flow_stage: string | null
          effective_from: string | null
          effective_to: string | null
          family: string | null
          id: string | null
          legal_nature: string | null
          name: string | null
          output_document: string | null
          process_code: string | null
          recipient: string | null
          updated_at: string | null
          version_major: number | null
          version_minor: number | null
        }
        Relationships: []
      }
      legal_requirements_current: {
        Row: {
          allows_override: boolean | null
          applicability_text: string | null
          catalog_status: string | null
          catalog_version: string | null
          created_at: string | null
          default_priority: string | null
          effective_from: string | null
          effective_to: string | null
          evidence_pending: boolean | null
          evidence_required: string | null
          family: string | null
          group_code: string | null
          group_name: string | null
          id: string | null
          is_customizable: boolean | null
          issuer: string | null
          legal_nature: string | null
          legal_reference: string | null
          output_document: string | null
          process_code: string | null
          recipient: string | null
          requirement_code: string | null
          requirement_level: string | null
          requirement_name: string | null
          source_document: string | null
          source_version: string | null
          updated_at: string | null
          version_major: number | null
          version_minor: number | null
        }
        Relationships: []
      }
      process_applicability_rules_current: {
        Row: {
          applicability: string | null
          catalog_status: string | null
          condition_json: Json | null
          created_at: string | null
          effective_from: string | null
          effective_to: string | null
          explanation: string | null
          id: string | null
          process_code: string | null
          updated_at: string | null
          version_major: number | null
          version_minor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_process_invitations: { Args: never; Returns: number }
      create_contingency: {
        Args: {
          p_child_name: string
          p_execution_mode: string
          p_parent_process_id: string
          p_reason: string
        }
        Returns: Json
      }
      generate_process_number: { Args: never; Returns: string }
      process_number_prefix: { Args: { _type: string }; Returns: string }
      purge_project_requirement_data: {
        Args: { p_project_id: string }
        Returns: number
      }
      seed_administracion_contrato_stages: {
        Args: { p_process_id: string }
        Returns: number
      }
      seed_compra_industrial_stages: {
        Args: { p_process_id: string }
        Returns: number
      }
      seed_licitacion_stages: {
        Args: { p_process_id: string }
        Returns: number
      }
      seed_obra_stages: { Args: { p_process_id: string }; Returns: number }
      seed_positions: { Args: { p_tenant_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "gestor" | "colaborador" | "lector"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "gestor", "colaborador", "lector"],
    },
  },
} as const
