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
            foreignKeyName: "minuta_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          created_at: string
          description: string | null
          id: string
          name: string
          process_id: string
          sort_order: number
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activities?: Json
          created_at?: string
          description?: string | null
          id?: string
          name: string
          process_id: string
          sort_order: number
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activities?: Json
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          process_id?: string
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
          process_number?: string
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
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
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
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          minuta_max_delivery_days?: number
          minuta_quality_threshold?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          minuta_max_delivery_days?: number
          minuta_quality_threshold?: number
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
      [_ in never]: never
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
      app_role: ["admin", "gestor", "colaborador", "lector"],
    },
  },
} as const
