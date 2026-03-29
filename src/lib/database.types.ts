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
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          nameEn: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id: string
          name: string
          nameEn: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          nameEn?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          calories: number | null
          category: string | null
          created_at: string
          description: string | null
          id: string
          image: string
          isAvailable: boolean | null
          isPopular: boolean | null
          name: string
          nameEn: string
          options: Json | null
          prepTime: number | null
          price: number
          rating: number | null
        }
        Insert: {
          calories?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id: string
          image: string
          isAvailable?: boolean | null
          isPopular?: boolean | null
          name: string
          nameEn: string
          options?: Json | null
          prepTime?: number | null
          price: number
          rating?: number | null
        }
        Update: {
          calories?: number | null
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image?: string
          isAvailable?: boolean | null
          isPopular?: boolean | null
          name?: string
          nameEn?: string
          options?: Json | null
          prepTime?: number | null
          price?: number
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_fkey"
            columns: ["category"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          custom_name: string | null
          id: string
          menu_item_id: string | null
          note: string | null
          order_id: string | null
          price_at_time: number
          quantity: number
          selected_options: Json | null
        }
        Insert: {
          custom_name?: string | null
          id?: string
          menu_item_id?: string | null
          note?: string | null
          order_id?: string | null
          price_at_time: number
          quantity: number
          selected_options?: Json | null
        }
        Update: {
          custom_name?: string | null
          id?: string
          menu_item_id?: string | null
          note?: string | null
          order_id?: string | null
          price_at_time?: number
          quantity?: number
          selected_options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address: string | null
          created_at: string
          customerName: string
          delivery_fee: number | null
          deliveryFee: number
          id: string
          note: string | null
          order_type: string | null
          payment_slip_url: string | null
          paymentMethod: string
          phone: string
          pickup_time: string | null
          queue_number: number | null
          status: string | null
          subtotal: number
          total: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          customerName: string
          delivery_fee?: number | null
          deliveryFee: number
          id: string
          note?: string | null
          order_type?: string | null
          payment_slip_url?: string | null
          paymentMethod: string
          phone: string
          pickup_time?: string | null
          queue_number?: number | null
          status?: string | null
          subtotal: number
          total: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          customerName?: string
          delivery_fee?: number | null
          deliveryFee?: number
          id?: string
          note?: string | null
          order_type?: string | null
          payment_slip_url?: string | null
          paymentMethod?: string
          phone?: string
          pickup_time?: string | null
          queue_number?: number | null
          status?: string | null
          subtotal?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          auto_close_enabled: boolean | null
          base_delivery_fee: number | null
          closing_time: string | null
          fee_per_km: number | null
          free_delivery_km: number | null
          id: number
          max_delivery_km: number | null
          opening_time: string | null
          promptpay_name: string
          promptpay_number: string
          restaurant_name: string
          store_lat: number | null
          store_lng: number | null
        }
        Insert: {
          auto_close_enabled?: boolean | null
          base_delivery_fee?: number | null
          closing_time?: string | null
          fee_per_km?: number | null
          free_delivery_km?: number | null
          id: number
          max_delivery_km?: number | null
          opening_time?: string | null
          promptpay_name: string
          promptpay_number: string
          restaurant_name: string
          store_lat?: number | null
          store_lng?: number | null
        }
        Update: {
          auto_close_enabled?: boolean | null
          base_delivery_fee?: number | null
          closing_time?: string | null
          fee_per_km?: number | null
          free_delivery_km?: number | null
          id?: number
          max_delivery_km?: number | null
          opening_time?: string | null
          promptpay_name?: string
          promptpay_number?: string
          restaurant_name?: string
          store_lat?: number | null
          store_lng?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
