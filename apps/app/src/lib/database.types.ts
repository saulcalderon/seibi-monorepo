export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      ai_usage: {
        Row: {
          count: number
          day: string
          user_id: string
        }
        Insert: {
          count?: number
          day: string
          user_id: string
        }
        Update: {
          count?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          canceled_at: string | null
          created_at: string
          id: string
          notes: string | null
          scheduled_on: string
          service_id: string | null
          shop: string | null
          task_codes: string[]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_on: string
          service_id?: string | null
          shop?: string | null
          task_codes?: string[]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          scheduled_on?: string
          service_id?: string | null
          shop?: string | null
          task_codes?: string[]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["chat_role"]
          sources: Json
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["chat_role"]
          sources?: Json
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["chat_role"]
          sources?: Json
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimate_requests: {
        Row: {
          created_at: string
          estimate_id: string
          id: string
          user_id: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          estimate_id: string
          id?: string
          user_id: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          estimate_id?: string
          id?: string
          user_id?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estimate_requests_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estimate_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      estimates: {
        Row: {
          brand: string
          cache_key: string
          city: string
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          expires_at: string
          id: string
          model: string
          query: string
          result: Json
          sources: Json
          task_code: string | null
          year: number
        }
        Insert: {
          brand: string
          cache_key: string
          city?: string
          country: Database["public"]["Enums"]["country_code"]
          created_at?: string
          expires_at?: string
          id?: string
          model: string
          query: string
          result: Json
          sources?: Json
          task_code?: string | null
          year: number
        }
        Update: {
          brand?: string
          cache_key?: string
          city?: string
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          expires_at?: string
          id?: string
          model?: string
          query?: string
          result?: Json
          sources?: Json
          task_code?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "estimates_task_code_fkey"
            columns: ["task_code"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["code"]
          },
        ]
      }
      maintenance_schedule_items: {
        Row: {
          distance_km: number | null
          months: number | null
          note: string | null
          schedule_id: string
          severe_distance_km: number | null
          severe_months: number | null
          source_url: string | null
          task_code: string
        }
        Insert: {
          distance_km?: number | null
          months?: number | null
          note?: string | null
          schedule_id: string
          severe_distance_km?: number | null
          severe_months?: number | null
          source_url?: string | null
          task_code: string
        }
        Update: {
          distance_km?: number | null
          months?: number | null
          note?: string | null
          schedule_id?: string
          severe_distance_km?: number | null
          severe_months?: number | null
          source_url?: string | null
          task_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_schedule_items_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_schedule_items_task_code_fkey"
            columns: ["task_code"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["code"]
          },
        ]
      }
      maintenance_schedules: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          brand_key: string
          created_at: string
          engine_key: string
          error: string | null
          has_severe: boolean
          id: string
          looked_up_at: string | null
          market: string
          model_key: string
          sources: Json
          status: Database["public"]["Enums"]["schedule_status"]
          summary: string | null
          updated_at: string
          year: number
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand_key: string
          created_at?: string
          engine_key?: string
          error?: string | null
          has_severe?: boolean
          id?: string
          looked_up_at?: string | null
          market?: string
          model_key: string
          sources?: Json
          status?: Database["public"]["Enums"]["schedule_status"]
          summary?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand_key?: string
          created_at?: string
          engine_key?: string
          error?: string | null
          has_severe?: boolean
          id?: string
          looked_up_at?: string | null
          market?: string
          model_key?: string
          sources?: Json
          status?: Database["public"]["Enums"]["schedule_status"]
          summary?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      maintenance_tasks: {
        Row: {
          code: string
          description: string
          general_distance_km: number | null
          general_months: number | null
          name: string
          plain_name: string
          sort_order: number
        }
        Insert: {
          code: string
          description: string
          general_distance_km?: number | null
          general_months?: number | null
          name: string
          plain_name: string
          sort_order: number
        }
        Update: {
          code?: string
          description?: string
          general_distance_km?: number | null
          general_months?: number | null
          name?: string
          plain_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      mileage_readings: {
        Row: {
          created_at: string
          id: string
          reading: number
          recorded_on: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reading: number
          recorded_on: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reading?: number
          recorded_on?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mileage_readings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      model_renders: {
        Row: {
          attempts: number
          body_type: Database["public"]["Enums"]["body_type"] | null
          brand: string
          color: string
          created_at: string
          error: string | null
          fal_request_id: string | null
          glb_path: string | null
          id: string
          model: string
          poster_path: string | null
          render_key: string
          status: Database["public"]["Enums"]["render_status"]
          updated_at: string
          year: number
        }
        Insert: {
          attempts?: number
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand: string
          color: string
          created_at?: string
          error?: string | null
          fal_request_id?: string | null
          glb_path?: string | null
          id?: string
          model: string
          poster_path?: string | null
          render_key: string
          status?: Database["public"]["Enums"]["render_status"]
          updated_at?: string
          year: number
        }
        Update: {
          attempts?: number
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand?: string
          color?: string
          created_at?: string
          error?: string | null
          fal_request_id?: string | null
          glb_path?: string | null
          id?: string
          model?: string
          poster_path?: string | null
          render_key?: string
          status?: Database["public"]["Enums"]["render_status"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          country: Database["public"]["Enums"]["country_code"] | null
          created_at: string
          display_name: string | null
          knowledge_level: Database["public"]["Enums"]["knowledge_level"] | null
          notifications_enabled: boolean
          onboarded_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          display_name?: string | null
          knowledge_level?:
            | Database["public"]["Enums"]["knowledge_level"]
            | null
          notifications_enabled?: boolean
          onboarded_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          city?: string | null
          country?: Database["public"]["Enums"]["country_code"] | null
          created_at?: string
          display_name?: string | null
          knowledge_level?:
            | Database["public"]["Enums"]["knowledge_level"]
            | null
          notifications_enabled?: boolean
          onboarded_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_states: {
        Row: {
          last_unknown: boolean
          remembered_on: string | null
          remembered_reading: number | null
          snoozed_until: string | null
          task_code: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          last_unknown?: boolean
          remembered_on?: string | null
          remembered_reading?: number | null
          snoozed_until?: string | null
          task_code: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          last_unknown?: boolean
          remembered_on?: string | null
          remembered_reading?: number | null
          snoozed_until?: string | null
          task_code?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_states_task_code_fkey"
            columns: ["task_code"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "reminder_states_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          deleted_at: string | null
          done_at: string | null
          due_on: string
          id: string
          notes: string | null
          title: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          done_at?: string | null
          due_on: string
          id?: string
          notes?: string | null
          title: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          done_at?: string | null
          due_on?: string
          id?: string
          notes?: string | null
          title?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          days_per_week: number
          id: string
          name: string
          round_trip_distance: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          id?: string
          name: string
          round_trip_distance: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          id?: string
          name?: string
          round_trip_distance?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_items: {
        Row: {
          cost: number | null
          created_at: string
          id: string
          name: string
          part_brand: string | null
          part_number: string | null
          service_id: string
          task_code: string | null
          updated_at: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          id?: string
          name: string
          part_brand?: string | null
          part_number?: string | null
          service_id: string
          task_code?: string | null
          updated_at?: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          id?: string
          name?: string
          part_brand?: string | null
          part_number?: string | null
          service_id?: string
          task_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_items_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_items_task_code_fkey"
            columns: ["task_code"]
            isOneToOne: false
            referencedRelation: "maintenance_tasks"
            referencedColumns: ["code"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          invoice_path: string | null
          mileage_reading_id: string
          notes: string | null
          performed_on: string
          shop: string | null
          total_cost: number | null
          type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_path?: string | null
          mileage_reading_id: string
          notes?: string | null
          performed_on: string
          shop?: string | null
          total_cost?: number | null
          type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_path?: string | null
          mileage_reading_id?: string
          notes?: string | null
          performed_on?: string
          shop?: string | null
          total_cost?: number | null
          type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_reading_same_vehicle_fk"
            columns: ["mileage_reading_id", "vehicle_id"]
            isOneToOne: false
            referencedRelation: "mileage_readings"
            referencedColumns: ["id", "vehicle_id"]
          },
          {
            foreignKeyName: "services_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          body_type: Database["public"]["Enums"]["body_type"] | null
          brand: string
          color: string | null
          created_at: string
          deleted_at: string | null
          engine: string | null
          id: string
          model: string
          odometer_measure: Database["public"]["Enums"]["odometer_measure"]
          plate: string | null
          render_id: string | null
          schedule_id: string | null
          trim_level: string | null
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand: string
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          engine?: string | null
          id?: string
          model: string
          odometer_measure?: Database["public"]["Enums"]["odometer_measure"]
          plate?: string | null
          render_id?: string | null
          schedule_id?: string | null
          trim_level?: string | null
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          body_type?: Database["public"]["Enums"]["body_type"] | null
          brand?: string
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          engine?: string | null
          id?: string
          model?: string
          odometer_measure?: Database["public"]["Enums"]["odometer_measure"]
          plate?: string | null
          render_id?: string | null
          schedule_id?: string | null
          trim_level?: string | null
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_render_id_fkey"
            columns: ["render_id"]
            isOneToOne: false
            referencedRelation: "model_renders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "maintenance_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      invoke_reminders_daily: { Args: never; Returns: undefined }
      owns_vehicle: { Args: { p_vehicle_id: string }; Returns: boolean }
      spend_ai_lookup: {
        Args: { p_limit: number; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      body_type:
        | "sedan"
        | "hatchback"
        | "suv"
        | "pickup"
        | "van"
        | "minivan"
        | "coupe"
        | "wagon"
      chat_role: "user" | "assistant"
      country_code: "SV" | "US"
      knowledge_level: "none" | "basic" | "intermediate" | "advanced"
      odometer_measure: "km" | "mi"
      render_status: "pending" | "poster_ready" | "ready" | "failed"
      schedule_status: "pending" | "ready" | "general" | "failed"
      service_type: "maintenance" | "repair"
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
      body_type: [
        "sedan",
        "hatchback",
        "suv",
        "pickup",
        "van",
        "minivan",
        "coupe",
        "wagon",
      ],
      chat_role: ["user", "assistant"],
      country_code: ["SV", "US"],
      knowledge_level: ["none", "basic", "intermediate", "advanced"],
      odometer_measure: ["km", "mi"],
      render_status: ["pending", "poster_ready", "ready", "failed"],
      schedule_status: ["pending", "ready", "general", "failed"],
      service_type: ["maintenance", "repair"],
    },
  },
} as const

