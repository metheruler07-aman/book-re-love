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
      books: {
        Row: {
          area: string
          author: string
          buyback_window_days: number
          category: string
          chat_activated: boolean
          chat_fee: number
          chat_paid_at: string | null
          commission_override: number | null
          condition: Database["public"]["Enums"]["condition_grade"]
          courier: boolean
          cover: string
          delivery_deadline_days: number
          description: string | null
          id: string
          listed_at: string
          original_price: number
          photos: string[]
          price: number
          rejection_note: string | null
          removed: boolean
          rent_per_week: number | null
          self_deliver: boolean
          seller_id: string
          sold: boolean
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          area?: string
          author: string
          buyback_window_days?: number
          category?: string
          chat_activated?: boolean
          chat_fee?: number
          chat_paid_at?: string | null
          commission_override?: number | null
          condition: Database["public"]["Enums"]["condition_grade"]
          courier?: boolean
          cover?: string
          delivery_deadline_days?: number
          description?: string | null
          id?: string
          listed_at?: string
          original_price: number
          photos?: string[]
          price: number
          rejection_note?: string | null
          removed?: boolean
          rent_per_week?: number | null
          self_deliver?: boolean
          seller_id: string
          sold?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          area?: string
          author?: string
          buyback_window_days?: number
          category?: string
          chat_activated?: boolean
          chat_fee?: number
          chat_paid_at?: string | null
          commission_override?: number | null
          condition?: Database["public"]["Enums"]["condition_grade"]
          courier?: boolean
          cover?: string
          delivery_deadline_days?: number
          description?: string | null
          id?: string
          listed_at?: string
          original_price?: number
          photos?: string[]
          price?: number
          rejection_note?: string | null
          removed?: boolean
          rent_per_week?: number | null
          self_deliver?: boolean
          seller_id?: string
          sold?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: []
      }
      buyback_extensions: {
        Row: {
          book_id: string
          buyer_id: string
          created_at: string
          decided_at: string | null
          id: string
          order_id: string
          seller_id: string
          status: string
        }
        Insert: {
          book_id: string
          buyer_id: string
          created_at?: string
          decided_at?: string | null
          id?: string
          order_id: string
          seller_id: string
          status?: string
        }
        Update: {
          book_id?: string
          buyer_id?: string
          created_at?: string
          decided_at?: string | null
          id?: string
          order_id?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyback_extensions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyback_extensions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_view"
            referencedColumns: ["id"]
          },
        ]
      }
      buyback_requests: {
        Row: {
          base_amount: number
          book_id: string
          buyer_id: string
          claimed_condition: string
          created_at: string
          decided_at: string | null
          estimated_amount: number
          final_amount: number | null
          final_condition: string | null
          id: string
          order_id: string
          seller_id: string
          seller_note: string | null
          status: string
        }
        Insert: {
          base_amount: number
          book_id: string
          buyer_id: string
          claimed_condition: string
          created_at?: string
          decided_at?: string | null
          estimated_amount: number
          final_amount?: number | null
          final_condition?: string | null
          id?: string
          order_id: string
          seller_id: string
          seller_note?: string | null
          status?: string
        }
        Update: {
          base_amount?: number
          book_id?: string
          buyer_id?: string
          claimed_condition?: string
          created_at?: string
          decided_at?: string | null
          estimated_amount?: number
          final_amount?: number | null
          final_condition?: string | null
          id?: string
          order_id?: string
          seller_id?: string
          seller_note?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyback_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyback_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders_view"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          category: string
          percent: number
        }
        Insert: {
          category: string
          percent?: number
        }
        Update: {
          category?: string
          percent?: number
        }
        Relationships: []
      }
      community_requests: {
        Row: {
          author: string | null
          created_at: string
          id: string
          note: string | null
          requester_id: string
          title: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          id?: string
          note?: string | null
          requester_id: string
          title: string
        }
        Update: {
          author?: string | null
          created_at?: string
          id?: string
          note?: string | null
          requester_id?: string
          title?: string
        }
        Relationships: []
      }
      community_upvotes: {
        Row: {
          request_id: string
          user_id: string
        }
        Insert: {
          request_id: string
          user_id: string
        }
        Update: {
          request_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_upvotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "community_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          book_id: string | null
          created_at: string
          from_id: string
          id: string
          redacted: boolean
          text: string
          to_id: string
        }
        Insert: {
          book_id?: string | null
          created_at?: string
          from_id: string
          id?: string
          redacted?: boolean
          text: string
          to_id: string
        }
        Update: {
          book_id?: string | null
          created_at?: string
          from_id?: string
          id?: string
          redacted?: boolean
          text?: string
          to_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          commission_override: number | null
          course: string
          created_at: string
          id: string
          is_digital: boolean
          pages: number
          photos: string[]
          price: number
          rejection_note: string | null
          removed: boolean
          seller_id: string
          sold: boolean
          status: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Insert: {
          commission_override?: number | null
          course: string
          created_at?: string
          id?: string
          is_digital?: boolean
          pages?: number
          photos?: string[]
          price: number
          rejection_note?: string | null
          removed?: boolean
          seller_id: string
          sold?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
        }
        Update: {
          commission_override?: number | null
          course?: string
          created_at?: string
          id?: string
          is_digital?: boolean
          pages?: number
          photos?: string[]
          price?: number
          rejection_note?: string | null
          removed?: boolean
          seller_id?: string
          sold?: boolean
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_book_id: string | null
          related_note_id: string | null
          related_order_id: string | null
          related_thread_user_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_book_id?: string | null
          related_note_id?: string | null
          related_order_id?: string | null
          related_thread_user_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_book_id?: string | null
          related_note_id?: string | null
          related_order_id?: string | null
          related_thread_user_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          amount: number
          book_id: string
          buyer_id: string
          counter_amount: number | null
          created_at: string
          id: string
          message: string | null
          seller_id: string
          seller_note: string | null
          status: Database["public"]["Enums"]["offer_status"]
        }
        Insert: {
          amount: number
          book_id: string
          buyer_id: string
          counter_amount?: number | null
          created_at?: string
          id?: string
          message?: string | null
          seller_id: string
          seller_note?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Update: {
          amount?: number
          book_id?: string
          buyer_id?: string
          counter_amount?: number | null
          created_at?: string
          id?: string
          message?: string | null
          seller_id?: string
          seller_note?: string | null
          status?: Database["public"]["Enums"]["offer_status"]
        }
        Relationships: [
          {
            foreignKeyName: "offers_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          book_id: string | null
          buyer_id: string
          commission_amount: number
          created_at: string
          delivered_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          handoff_code: string | null
          id: string
          kind: Database["public"]["Enums"]["order_kind"]
          not_for_resale: boolean
          note_id: string | null
          payment_method: Database["public"]["Enums"]["payment_key"]
          received_photo: string | null
          rental_weeks: number | null
          seller_id: string
          settlement: string
          status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          amount: number
          book_id?: string | null
          buyer_id: string
          commission_amount?: number
          created_at?: string
          delivered_at?: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          handoff_code?: string | null
          id?: string
          kind: Database["public"]["Enums"]["order_kind"]
          not_for_resale?: boolean
          note_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_key"]
          received_photo?: string | null
          rental_weeks?: number | null
          seller_id: string
          settlement?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          amount?: number
          book_id?: string | null
          buyer_id?: string
          commission_amount?: number
          created_at?: string
          delivered_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          handoff_code?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["order_kind"]
          not_for_resale?: boolean
          note_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_key"]
          received_photo?: string | null
          rental_weeks?: number | null
          seller_id?: string
          settlement?: string
          status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          created_at: string
          default_chat_fee: number
          id: boolean
          owner_upi_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_chat_fee?: number
          id?: boolean
          owner_upi_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_chat_fee?: number
          id?: boolean
          owner_upi_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          area: string
          blocked: boolean
          created_at: string
          deletion_requested: boolean
          deletion_requested_at: string | null
          id: string
          is_admin: boolean
          name: string
          notifications_enabled: boolean
          payment_methods: Json
          phone: string
          radius_km: number
          ships_beyond_radius: boolean
          strike_count: number
        }
        Insert: {
          address?: string
          area?: string
          blocked?: boolean
          created_at?: string
          deletion_requested?: boolean
          deletion_requested_at?: string | null
          id: string
          is_admin?: boolean
          name?: string
          notifications_enabled?: boolean
          payment_methods?: Json
          phone?: string
          radius_km?: number
          ships_beyond_radius?: boolean
          strike_count?: number
        }
        Update: {
          address?: string
          area?: string
          blocked?: boolean
          created_at?: string
          deletion_requested?: boolean
          deletion_requested_at?: string | null
          id?: string
          is_admin?: boolean
          name?: string
          notifications_enabled?: boolean
          payment_methods?: Json
          phone?: string
          radius_km?: number
          ships_beyond_radius?: boolean
          strike_count?: number
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          area: string
          created_at: string
          id: string
          name: string
          payment_methods: Json
          radius_km: number
          ships_beyond_radius: boolean
        }
        Insert: {
          area: string
          created_at?: string
          id: string
          name: string
          payment_methods: Json
          radius_km: number
          ships_beyond_radius: boolean
        }
        Update: {
          area?: string
          created_at?: string
          id?: string
          name?: string
          payment_methods?: Json
          radius_km?: number
          ships_beyond_radius?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_interests: {
        Row: {
          recommendation_id: string
          user_id: string
        }
        Insert: {
          recommendation_id: string
          user_id: string
        }
        Update: {
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_interests_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_likes: {
        Row: {
          recommendation_id: string
          user_id: string
        }
        Insert: {
          recommendation_id: string
          user_id: string
        }
        Update: {
          recommendation_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_likes_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          author: string
          blurb: string
          created_at: string
          id: string
          recommender_id: string
          title: string
        }
        Insert: {
          author: string
          blurb: string
          created_at?: string
          id?: string
          recommender_id: string
          title: string
        }
        Update: {
          author?: string
          blurb?: string
          created_at?: string
          id?: string
          recommender_id?: string
          title?: string
        }
        Relationships: []
      }
      support_queries: {
        Row: {
          body: string
          book_id: string | null
          created_at: string
          id: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body: string
          book_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          body?: string
          book_id?: string | null
          created_at?: string
          id?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_queries_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
        ]
      }
      support_replies: {
        Row: {
          created_at: string
          from_id: string
          id: string
          query_id: string
          text: string
        }
        Insert: {
          created_at?: string
          from_id: string
          id?: string
          query_id: string
          text: string
        }
        Update: {
          created_at?: string
          from_id?: string
          id?: string
          query_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_replies_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "support_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      orders_view: {
        Row: {
          amount: number | null
          book_id: string | null
          buyer_id: string | null
          commission_amount: number | null
          created_at: string | null
          delivered_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          handoff_code: string | null
          id: string | null
          kind: Database["public"]["Enums"]["order_kind"] | null
          note_id: string | null
          payment_method: Database["public"]["Enums"]["payment_key"] | null
          received_photo: string | null
          rental_weeks: number | null
          seller_id: string | null
          status: Database["public"]["Enums"]["order_status"] | null
          visible_handoff_code: string | null
        }
        Insert: {
          amount?: number | null
          book_id?: string | null
          buyer_id?: string | null
          commission_amount?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          handoff_code?: string | null
          id?: string | null
          kind?: Database["public"]["Enums"]["order_kind"] | null
          note_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_key"] | null
          received_photo?: string | null
          rental_weeks?: number | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          visible_handoff_code?: never
        }
        Update: {
          amount?: number | null
          book_id?: string | null
          buyer_id?: string | null
          commission_amount?: number | null
          created_at?: string | null
          delivered_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          handoff_code?: string | null
          id?: string | null
          kind?: Database["public"]["Enums"]["order_kind"] | null
          note_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_key"] | null
          received_photo?: string | null
          rental_weeks?: number | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["order_status"] | null
          visible_handoff_code?: never
        }
        Relationships: [
          {
            foreignKeyName: "orders_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "buyer" | "seller" | "admin"
      condition_grade: "New" | "Like New" | "Good" | "Fair"
      delivery_mode: "self" | "courier"
      listing_status: "pending" | "approved" | "rejected"
      offer_status: "pending" | "accepted" | "declined" | "countered"
      order_kind: "buy" | "rent" | "buyback" | "notes"
      order_status:
        | "awaiting_handoff"
        | "awaiting_delivery"
        | "delivered"
        | "cancelled"
        | "overdue_review"
        | "completed"
        | "arranged_direct"
      payment_key: "upi" | "card" | "wallet" | "cod"
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
      app_role: ["buyer", "seller", "admin"],
      condition_grade: ["New", "Like New", "Good", "Fair"],
      delivery_mode: ["self", "courier"],
      listing_status: ["pending", "approved", "rejected"],
      offer_status: ["pending", "accepted", "declined", "countered"],
      order_kind: ["buy", "rent", "buyback", "notes"],
      order_status: [
        "awaiting_handoff",
        "awaiting_delivery",
        "delivered",
        "cancelled",
        "overdue_review",
        "completed",
        "arranged_direct",
      ],
      payment_key: ["upi", "card", "wallet", "cod"],
    },
  },
} as const
