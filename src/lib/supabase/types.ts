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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      advisors: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          branding: Json
          created_at: string
          demo_login_enabled: boolean
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["advisor_role"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          branding?: Json
          created_at?: string
          demo_login_enabled?: boolean
          email: string
          full_name: string
          id?: string
          role?: Database["public"]["Enums"]["advisor_role"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          branding?: Json
          created_at?: string
          demo_login_enabled?: boolean
          email?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["advisor_role"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          advisor_id: string | null
          created_at: string
          event_data: Json
          event_type: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          advisor_id?: string | null
          created_at?: string
          event_data?: Json
          event_type: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          advisor_id?: string | null
          created_at?: string
          event_data?: Json
          event_type?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          model: string | null
          role: Database["public"]["Enums"]["assistant_role"]
          thread_id: string
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          model?: string | null
          role: Database["public"]["Enums"]["assistant_role"]
          thread_id: string
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          model?: string | null
          role?: Database["public"]["Enums"]["assistant_role"]
          thread_id?: string
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          advisor_id: string
          created_at: string
          id: string
          tenant_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          id?: string
          tenant_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          id?: string
          tenant_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_threads_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      calculations: {
        Row: {
          calculator_version: string | null
          created_at: string
          extraction_id: string
          id: string
          meeting_id: string
          results: Json
          updated_at: string
        }
        Insert: {
          calculator_version?: string | null
          created_at?: string
          extraction_id: string
          id?: string
          meeting_id: string
          results: Json
          updated_at?: string
        }
        Update: {
          calculator_version?: string | null
          created_at?: string
          extraction_id?: string
          id?: string
          meeting_id?: string
          results?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calculations_extraction_id_fkey"
            columns: ["extraction_id"]
            isOneToOne: false
            referencedRelation: "extractions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculations_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          advisor_id: string
          birth_date: string | null
          created_at: string
          email: string | null
          full_name: string
          has_children: boolean | null
          id: string
          marital_status: Database["public"]["Enums"]["marital_status"] | null
          monthly_income_czk: number | null
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          has_children?: boolean | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          monthly_income_czk?: number | null
          notes?: string | null
          phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          birth_date?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          has_children?: boolean | null
          id?: string
          marital_status?: Database["public"]["Enums"]["marital_status"] | null
          monthly_income_czk?: number | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      extractions: {
        Row: {
          advisor_feedback_score: number | null
          advisor_feedback_text: string | null
          created_at: string
          id: string
          latency_ms: number | null
          meeting_id: string
          model: string | null
          prompt_version: string | null
          structured_data: Json
          tokens_used: number | null
          transcript_id: string
          updated_at: string
        }
        Insert: {
          advisor_feedback_score?: number | null
          advisor_feedback_text?: string | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          meeting_id: string
          model?: string | null
          prompt_version?: string | null
          structured_data: Json
          tokens_used?: number | null
          transcript_id: string
          updated_at?: string
        }
        Update: {
          advisor_feedback_score?: number | null
          advisor_feedback_text?: string | null
          created_at?: string
          id?: string
          latency_ms?: number | null
          meeting_id?: string
          model?: string | null
          prompt_version?: string | null
          structured_data?: Json
          tokens_used?: number | null
          transcript_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extractions_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extractions_transcript_id_fkey"
            columns: ["transcript_id"]
            isOneToOne: false
            referencedRelation: "transcripts"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          advisor_id: string
          audio_duration_sec: number | null
          audio_url: string | null
          capture_method: Database["public"]["Enums"]["capture_method"] | null
          created_at: string
          customer_id: string
          id: string
          recorded_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          audio_duration_sec?: number | null
          audio_url?: string | null
          capture_method?: Database["public"]["Enums"]["capture_method"] | null
          created_at?: string
          customer_id: string
          id?: string
          recorded_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          audio_duration_sec?: number | null
          audio_url?: string | null
          capture_method?: Database["public"]["Enums"]["capture_method"] | null
          created_at?: string
          customer_id?: string
          id?: string
          recorded_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          advisor_id: string
          created_at: string
          customer_id: string
          generated_text: string | null
          id: string
          meeting_id: string | null
          model: string | null
          pdf_url: string | null
          status: Database["public"]["Enums"]["offer_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          advisor_id: string
          created_at?: string
          customer_id: string
          generated_text?: string | null
          id?: string
          meeting_id?: string | null
          model?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          advisor_id?: string
          created_at?: string
          customer_id?: string
          generated_text?: string | null
          id?: string
          meeting_id?: string | null
          model?: string | null
          pdf_url?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          branding: Json
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      transcripts: {
        Row: {
          created_at: string
          id: string
          language: string
          live_text: string | null
          meeting_id: string
          prompt_version: string | null
          reconcile_latency_ms: number | null
          reconcile_model: string | null
          reconcile_tokens: number | null
          text: string | null
          updated_at: string
          whisper_latency_ms: number | null
          whisper_model: string | null
          whisper_text: string | null
          whisper_tokens: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          live_text?: string | null
          meeting_id: string
          prompt_version?: string | null
          reconcile_latency_ms?: number | null
          reconcile_model?: string | null
          reconcile_tokens?: number | null
          text?: string | null
          updated_at?: string
          whisper_latency_ms?: number | null
          whisper_model?: string | null
          whisper_text?: string | null
          whisper_tokens?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          live_text?: string | null
          meeting_id?: string
          prompt_version?: string | null
          reconcile_latency_ms?: number | null
          reconcile_model?: string | null
          reconcile_tokens?: number | null
          text?: string | null
          updated_at?: string
          whisper_latency_ms?: number | null
          whisper_model?: string | null
          whisper_text?: string | null
          whisper_tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transcripts_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: true
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      advisor_id: { Args: never; Returns: string }
      advisor_role: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      is_tenant_admin: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      advisor_role: "advisor" | "tenant_admin" | "super_admin"
      assistant_role: "user" | "assistant"
      capture_method: "browser_live" | "file_upload"
      marital_status: "single" | "married" | "divorced" | "widowed"
      meeting_status:
        | "idle"
        | "recording"
        | "uploaded"
        | "transcribing"
        | "reconciling"
        | "extracting"
        | "extracted"
        | "generating"
        | "ready"
        | "failed"
      offer_status: "draft" | "sent" | "signed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      advisor_role: ["advisor", "tenant_admin", "super_admin"],
      assistant_role: ["user", "assistant"],
      capture_method: ["browser_live", "file_upload"],
      marital_status: ["single", "married", "divorced", "widowed"],
      meeting_status: [
        "idle",
        "recording",
        "uploaded",
        "transcribing",
        "reconciling",
        "extracting",
        "extracted",
        "generating",
        "ready",
        "failed",
      ],
      offer_status: ["draft", "sent", "signed"],
    },
  },
} as const
