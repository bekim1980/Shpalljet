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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json | null
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          product_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          product_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          product_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          price: number
          product_id: string | null
          quantity: number
        }
        Insert: {
          id?: string
          order_id: string
          price: number
          product_id?: string | null
          quantity?: number
        }
        Update: {
          id?: string
          order_id?: string
          price?: number
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string
          created_at: string
          currency: string
          id: string
          product_id: string | null
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          currency?: string
          id?: string
          product_id?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          currency?: string
          id?: string
          product_id?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          provider: string
          provider_payment_intent_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          provider?: string
          provider_payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          provider?: string
          provider_payment_intent_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string
          seller_id: string
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id: string
          seller_id: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_messages: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          product_id: string
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          product_id: string
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          product_id?: string
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_messages_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string
          viewer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          viewer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          application_email: string | null
          application_url: string | null
          auto_renew: boolean
          availability: string | null
          boost_expires_at: string | null
          brand: string | null
          category: string
          category_id: string | null
          city: string | null
          company_name: string | null
          condition: string
          contact_method: string
          country: string | null
          created_at: string
          currency: string
          description: string
          experience_level: string | null
          expires_at: string | null
          favorites_count: number
          id: string
          image_urls: string[]
          is_boosted: boolean
          job_location: string | null
          job_type: string | null
          listing_type: string
          location: string | null
          messages_count: number
          moderation_status: string
          price: number
          price_history: Json | null
          price_period: string | null
          provider_profile: string | null
          quality_score: number
          rental_period: string | null
          salary_max: number | null
          salary_min: number | null
          search_score: number
          search_vector: unknown
          seller_id: string
          service_area: string | null
          service_category: string | null
          status: string
          title: string
          updated_at: string
          vertical: string
          views_count: number
        }
        Insert: {
          application_email?: string | null
          application_url?: string | null
          auto_renew?: boolean
          availability?: string | null
          boost_expires_at?: string | null
          brand?: string | null
          category?: string
          category_id?: string | null
          city?: string | null
          company_name?: string | null
          condition?: string
          contact_method?: string
          country?: string | null
          created_at?: string
          currency?: string
          description?: string
          experience_level?: string | null
          expires_at?: string | null
          favorites_count?: number
          id?: string
          image_urls?: string[]
          is_boosted?: boolean
          job_location?: string | null
          job_type?: string | null
          listing_type?: string
          location?: string | null
          messages_count?: number
          moderation_status?: string
          price: number
          price_history?: Json | null
          price_period?: string | null
          provider_profile?: string | null
          quality_score?: number
          rental_period?: string | null
          salary_max?: number | null
          salary_min?: number | null
          search_score?: number
          search_vector?: unknown
          seller_id: string
          service_area?: string | null
          service_category?: string | null
          status?: string
          title: string
          updated_at?: string
          vertical?: string
          views_count?: number
        }
        Update: {
          application_email?: string | null
          application_url?: string | null
          auto_renew?: boolean
          availability?: string | null
          boost_expires_at?: string | null
          brand?: string | null
          category?: string
          category_id?: string | null
          city?: string | null
          company_name?: string | null
          condition?: string
          contact_method?: string
          country?: string | null
          created_at?: string
          currency?: string
          description?: string
          experience_level?: string | null
          expires_at?: string | null
          favorites_count?: number
          id?: string
          image_urls?: string[]
          is_boosted?: boolean
          job_location?: string | null
          job_type?: string | null
          listing_type?: string
          location?: string | null
          messages_count?: number
          moderation_status?: string
          price?: number
          price_history?: Json | null
          price_period?: string | null
          provider_profile?: string | null
          quality_score?: number
          rental_period?: string | null
          salary_max?: number | null
          salary_min?: number | null
          search_score?: number
          search_vector?: unknown
          seller_id?: string
          service_area?: string | null
          service_category?: string | null
          status?: string
          title?: string
          updated_at?: string
          vertical?: string
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banned_at: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          phone_number: string | null
          region: string | null
          suspended_until: string | null
          updated_at: string
          user_id: string
          viber_enabled: boolean
          whatsapp_enabled: boolean
        }
        Insert: {
          avatar_url?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string | null
          region?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id: string
          viber_enabled?: boolean
          whatsapp_enabled?: boolean
        }
        Update: {
          avatar_url?: string | null
          banned_at?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone_number?: string | null
          region?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
          viber_enabled?: boolean
          whatsapp_enabled?: boolean
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          description: string
          id: string
          reason: string
          reported_id: string
          reported_type: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          reason: string
          reported_id: string
          reported_type?: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          reason?: string
          reported_id?: string
          reported_type?: string
          reporter_id?: string
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          id: string
          product_id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          product_id: string
          rating: number
          reviewer_id: string
          seller_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          product_id?: string
          rating?: number
          reviewer_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          created_at: string
          departure_time: string
          from_city: string
          id: string
          notes: string | null
          price: number | null
          seats_available: number
          seats_total: number
          status: string
          to_city: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          departure_time: string
          from_city: string
          id?: string
          notes?: string | null
          price?: number | null
          seats_available?: number
          seats_total?: number
          status?: string
          to_city: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          departure_time?: string
          from_city?: string
          id?: string
          notes?: string | null
          price?: number | null
          seats_available?: number
          seats_total?: number
          status?: string
          to_city?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          category_id: string | null
          condition: string | null
          created_at: string
          id: string
          is_active: boolean
          last_checked_at: string
          last_notified_at: string | null
          location: string | null
          price_max: number | null
          price_min: number | null
          query: string
          sort_by: string | null
          updated_at: string
          user_id: string
          vertical: string | null
        }
        Insert: {
          category_id?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string
          last_notified_at?: string | null
          location?: string | null
          price_max?: number | null
          price_min?: number | null
          query?: string
          sort_by?: string | null
          updated_at?: string
          user_id: string
          vertical?: string | null
        }
        Update: {
          category_id?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string
          last_notified_at?: string | null
          location?: string | null
          price_max?: number | null
          price_min?: number | null
          query?: string
          sort_by?: string | null
          updated_at?: string
          user_id?: string
          vertical?: string | null
        }
        Relationships: []
      }
      search_alerts: {
        Row: {
          created_at: string
          final_score: number | null
          id: string
          product_id: string
          saved_search_id: string
        }
        Insert: {
          created_at?: string
          final_score?: number | null
          id?: string
          product_id: string
          saved_search_id: string
        }
        Update: {
          created_at?: string
          final_score?: number | null
          id?: string
          product_id?: string
          saved_search_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_alerts_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      search_events: {
        Row: {
          created_at: string
          id: string
          parsed_category: string | null
          parsed_condition: string | null
          parsed_keywords: string[] | null
          parsed_location: string | null
          parsed_price_max: number | null
          parsed_price_min: number | null
          query: string
          results_count: number
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          parsed_category?: string | null
          parsed_condition?: string | null
          parsed_keywords?: string[] | null
          parsed_location?: string | null
          parsed_price_max?: number | null
          parsed_price_min?: number | null
          query?: string
          results_count?: number
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          parsed_category?: string | null
          parsed_condition?: string | null
          parsed_keywords?: string[] | null
          parsed_location?: string | null
          parsed_price_max?: number | null
          parsed_price_min?: number | null
          query?: string
          results_count?: number
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      wishlist: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_product_quality_score: {
        Args: {
          p_category: string
          p_description: string
          p_image_count: number
          p_price: number
          p_title: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      rank_products: {
        Args: {
          filter_category_id?: string
          filter_condition?: string
          filter_location?: string
          filter_price_max?: number
          filter_price_min?: number
          filter_vertical?: string
          result_limit?: number
          result_offset?: number
          search_query?: string
        }
        Returns: {
          auto_renew: boolean
          boost_expires_at: string
          category: string
          city: string
          condition: string
          contact_method: string
          country: string
          created_at: string
          currency: string
          description: string
          expires_at: string
          favorites_count: number
          final_score: number
          id: string
          image_urls: string[]
          is_boosted: boolean
          listing_type: string
          messages_count: number
          price: number
          quality_score: number
          seller_id: string
          status: string
          title: string
          vertical: string
          views_count: number
        }[]
      }
      search_products: {
        Args: {
          filter_category_id?: string
          filter_condition?: string
          filter_location?: string
          filter_price_max?: number
          filter_price_min?: number
          filter_vertical?: string
          result_limit?: number
          result_offset?: number
          search_query?: string
          sort_by?: string
        }
        Returns: {
          application_email: string | null
          application_url: string | null
          auto_renew: boolean
          availability: string | null
          boost_expires_at: string | null
          brand: string | null
          category: string
          category_id: string | null
          city: string | null
          company_name: string | null
          condition: string
          contact_method: string
          country: string | null
          created_at: string
          currency: string
          description: string
          experience_level: string | null
          expires_at: string | null
          favorites_count: number
          id: string
          image_urls: string[]
          is_boosted: boolean
          job_location: string | null
          job_type: string | null
          listing_type: string
          location: string | null
          messages_count: number
          moderation_status: string
          price: number
          price_history: Json | null
          price_period: string | null
          provider_profile: string | null
          quality_score: number
          rental_period: string | null
          salary_max: number | null
          salary_min: number | null
          search_score: number
          search_vector: unknown
          seller_id: string
          service_area: string | null
          service_category: string | null
          status: string
          title: string
          updated_at: string
          vertical: string
          views_count: number
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      order_status:
        | "pending"
        | "confirmed"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "refunded"
      payout_status: "pending" | "processing" | "completed" | "failed"
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
      app_role: ["admin", "moderator", "user"],
      order_status: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "refunded",
      ],
      payout_status: ["pending", "processing", "completed", "failed"],
    },
  },
} as const
