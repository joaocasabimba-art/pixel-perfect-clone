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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          address: string | null
          city: string | null
          company_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          lead_id: string | null
          name: string
          phone: string | null
          state: string | null
          tags: string[] | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name: string
          phone?: string | null
          state?: string | null
          tags?: string[] | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          lead_id?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          cnpj: string | null
          created_at: string
          crq_crea: string | null
          id: string
          name: string
          phone: string | null
          responsible_tech: string | null
        }
        Insert: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          crq_crea?: string | null
          id?: string
          name: string
          phone?: string | null
          responsible_tech?: string | null
        }
        Update: {
          address?: string | null
          cnpj?: string | null
          created_at?: string
          crq_crea?: string | null
          id?: string
          name?: string
          phone?: string | null
          responsible_tech?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: Json | null
          client_id: string | null
          company_id: string
          created_at: string
          email: string | null
          id: string
          last_action: string | null
          location: string | null
          name: string
          notes: string | null
          origin: string | null
          phone: string | null
          quote_value: number | null
          service_type: string | null
          status: string
        }
        Insert: {
          address?: Json | null
          client_id?: string | null
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          last_action?: string | null
          location?: string | null
          name: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          quote_value?: number | null
          service_type?: string | null
          status?: string
        }
        Update: {
          address?: Json | null
          client_id?: string | null
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          last_action?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          origin?: string | null
          phone?: string | null
          quote_value?: number | null
          service_type?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          company_id: string
          cost: number | null
          created_at: string
          id: string
          min_stock: number | null
          name: string
          stock: number
          supplier: string | null
          unit: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          cost?: number | null
          created_at?: string
          id?: string
          min_stock?: number | null
          name: string
          stock?: number
          supplier?: string | null
          unit?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          cost?: number | null
          created_at?: string
          id?: string
          min_stock?: number | null
          name?: string
          stock?: number
          supplier?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          role?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      recurrences: {
        Row: {
          client_id: string
          company_id: string
          created_at: string
          id: string
          interval_months: number
          last_service_date: string | null
          next_service_date: string | null
          service_type: string
        }
        Insert: {
          client_id: string
          company_id: string
          created_at?: string
          id?: string
          interval_months?: number
          last_service_date?: string | null
          next_service_date?: string | null
          service_type: string
        }
        Update: {
          client_id?: string
          company_id?: string
          created_at?: string
          id?: string
          interval_months?: number
          last_service_date?: string | null
          next_service_date?: string | null
          service_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurrences_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          client_id: string | null
          company_id: string
          content: Json | null
          created_at: string
          id: string
          service_id: string | null
          status: string
          tech_id: string | null
          validity_date: string | null
        }
        Insert: {
          client_id?: string | null
          company_id: string
          content?: Json | null
          created_at?: string
          id?: string
          service_id?: string | null
          status?: string
          tech_id?: string | null
          validity_date?: string | null
        }
        Update: {
          client_id?: string | null
          company_id?: string
          content?: Json | null
          created_at?: string
          id?: string
          service_id?: string | null
          status?: string
          tech_id?: string | null
          validity_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_tech_id_fkey"
            columns: ["tech_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          address: string | null
          assigned_to: string | null
          client_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          end_time: string | null
          id: string
          lead_id: string | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: string | null
          scheduled_date: string | null
          service_type: string
          start_time: string | null
          started_at: string | null
          status: string
          value: number | null
        }
        Insert: {
          address?: string | null
          assigned_to?: string | null
          client_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          scheduled_date?: string | null
          service_type: string
          start_time?: string | null
          started_at?: string | null
          status?: string
          value?: number | null
        }
        Update: {
          address?: string | null
          assigned_to?: string | null
          client_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          end_time?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string | null
          scheduled_date?: string | null
          service_type?: string
          start_time?: string | null
          started_at?: string | null
          status?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "services_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          areas_treated: Json | null
          client_signature: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          number: number
          photos: string[] | null
          products_used: Json | null
          service_id: string
          started_at: string | null
          status: string
          target_pests: string[] | null
          tech_notes: string | null
          updated_at: string
        }
        Insert: {
          areas_treated?: Json | null
          client_signature?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          number?: number
          photos?: string[] | null
          products_used?: Json | null
          service_id: string
          started_at?: string | null
          status?: string
          target_pests?: string[] | null
          tech_notes?: string | null
          updated_at?: string
        }
        Update: {
          areas_treated?: Json | null
          client_signature?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          number?: number
          photos?: string[] | null
          products_used?: Json | null
          service_id?: string
          started_at?: string | null
          status?: string
          target_pests?: string[] | null
          tech_notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: true
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
