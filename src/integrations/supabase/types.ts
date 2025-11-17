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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      occupied_slot_items: {
        Row: {
          created_at: string | null
          occupied_id: string | null
          slot_id: string
        }
        Insert: {
          created_at?: string | null
          occupied_id?: string | null
          slot_id: string
        }
        Update: {
          created_at?: string | null
          occupied_id?: string | null
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupied_slot_items_occupied_id_fkey"
            columns: ["occupied_id"]
            isOneToOne: false
            referencedRelation: "occupied_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      occupied_slots: {
        Row: {
          bottom_right: string | null
          created_at: string
          id: string
          rectangle_id: string | null
          slot_id: string
          submission_id: string | null
          top_left: string | null
          video_asset_id: string | null
          video_url: string
        }
        Insert: {
          bottom_right?: string | null
          created_at?: string
          id?: string
          rectangle_id?: string | null
          slot_id: string
          submission_id?: string | null
          top_left?: string | null
          video_asset_id?: string | null
          video_url: string
        }
        Update: {
          bottom_right?: string | null
          created_at?: string
          id?: string
          rectangle_id?: string | null
          slot_id?: string
          submission_id?: string | null
          top_left?: string | null
          video_asset_id?: string | null
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "occupied_slots_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing: {
        Row: {
          amount_cents: number
          created_at: string
          description: string | null
          key: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          description?: string | null
          key: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          description?: string | null
          key?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          blurb: string | null
          cover_url: string | null
          href: string | null
          id: string
          sort: number | null
          status: string | null
          tag: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          blurb?: string | null
          cover_url?: string | null
          href?: string | null
          id: string
          sort?: number | null
          status?: string | null
          tag?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          blurb?: string | null
          cover_url?: string | null
          href?: string | null
          id?: string
          sort?: number | null
          status?: string | null
          tag?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promo_code_attempts: {
        Row: {
          attempted_at: string
          created_at: string
          email: string
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          created_at?: string
          email: string
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          created_at?: string
          email?: string
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      slot_hold_items: {
        Row: {
          created_at: string | null
          hold_id: string | null
          slot_id: string
        }
        Insert: {
          created_at?: string | null
          hold_id?: string | null
          slot_id: string
        }
        Update: {
          created_at?: string | null
          hold_id?: string | null
          slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "slot_hold_items_hold_id_fkey"
            columns: ["hold_id"]
            isOneToOne: false
            referencedRelation: "slot_holds"
            referencedColumns: ["id"]
          },
        ]
      }
      slot_holds: {
        Row: {
          bottom_right: string | null
          checkout_session_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string
          top_left: string | null
          user_id: string | null
        }
        Insert: {
          bottom_right?: string | null
          checkout_session_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          top_left?: string | null
          user_id?: string | null
        }
        Update: {
          bottom_right?: string | null
          checkout_session_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          top_left?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      slots: {
        Row: {
          created_at: string
          id: string
          owner_id: string | null
          reserved_by: string | null
          reserved_expires_at: string | null
          status: string
          term_end: string | null
        }
        Insert: {
          created_at?: string
          id: string
          owner_id?: string | null
          reserved_by?: string | null
          reserved_expires_at?: string | null
          status?: string
          term_end?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string | null
          reserved_by?: string | null
          reserved_expires_at?: string | null
          status?: string
          term_end?: string | null
        }
        Relationships: []
      }
      video_submissions: {
        Row: {
          admin_notes: string | null
          amount_cents: number | null
          amount_paid: number
          approved_at: string | null
          bottom_right: string | null
          created_at: string
          currency: string | null
          duration_seconds: number | null
          email: string
          height: number | null
          id: string
          linked_url: string | null
          payment_intent_id: string
          poster_url: string | null
          rejected_at: string | null
          slots: Json
          status: string
          top_left: string | null
          transcoding_status: string | null
          user_id: string
          video_asset_id: string | null
          video_filename: string | null
          video_url: string | null
          width: number | null
        }
        Insert: {
          admin_notes?: string | null
          amount_cents?: number | null
          amount_paid: number
          approved_at?: string | null
          bottom_right?: string | null
          created_at?: string
          currency?: string | null
          duration_seconds?: number | null
          email: string
          height?: number | null
          id?: string
          linked_url?: string | null
          payment_intent_id: string
          poster_url?: string | null
          rejected_at?: string | null
          slots: Json
          status?: string
          top_left?: string | null
          transcoding_status?: string | null
          user_id: string
          video_asset_id?: string | null
          video_filename?: string | null
          video_url?: string | null
          width?: number | null
        }
        Update: {
          admin_notes?: string | null
          amount_cents?: number | null
          amount_paid?: number
          approved_at?: string | null
          bottom_right?: string | null
          created_at?: string
          currency?: string | null
          duration_seconds?: number | null
          email?: string
          height?: number | null
          id?: string
          linked_url?: string | null
          payment_intent_id?: string
          poster_url?: string | null
          rejected_at?: string | null
          slots?: Json
          status?: string
          top_left?: string | null
          transcoding_status?: string | null
          user_id?: string
          video_asset_id?: string | null
          video_filename?: string | null
          video_url?: string | null
          width?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_promo_attempts: { Args: never; Returns: undefined }
      create_slot_hold_atomic: {
        Args: {
          p_bottom_right: string
          p_expires_minutes?: number
          p_slot_ids: string[]
          p_top_left: string
          p_user_id: string
        }
        Returns: {
          expires_at: string
          hold_id: string
        }[]
      }
      free_occupied_slots: {
        Args: { submission_id: string }
        Returns: undefined
      }
      purge_expired_slot_holds: { Args: never; Returns: undefined }
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
