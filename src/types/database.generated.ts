/**
 * Generated from the local Supabase schema. Do not edit manually.
 *
 * Regenerate:
 *   npm run types:generate
 *
 * Verify committed types match the local schema:
 *   npm run types:check
 */

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
      eazy_assessments: {
        Row: {
          acquisition_ease: number | null
          collection: number | null
          comfort: number | null
          craftsmanship: number | null
          created_at: string
          id: string
          is_current: boolean
          look: number | null
          maintenance: number | null
          material: number | null
          methodology_version: string | null
          outfit: number | null
          product_id: string
          resale_potential: number | null
          score: number | null
          updated_at: string
          value: number | null
        }
        Insert: {
          acquisition_ease?: number | null
          collection?: number | null
          comfort?: number | null
          craftsmanship?: number | null
          created_at?: string
          id?: string
          is_current?: boolean
          look?: number | null
          maintenance?: number | null
          material?: number | null
          methodology_version?: string | null
          outfit?: number | null
          product_id: string
          resale_potential?: number | null
          score?: number | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          acquisition_ease?: number | null
          collection?: number | null
          comfort?: number | null
          craftsmanship?: number | null
          created_at?: string
          id?: string
          is_current?: boolean
          look?: number | null
          maintenance?: number | null
          material?: number | null
          methodology_version?: string | null
          outfit?: number | null
          product_id?: string
          resale_potential?: number | null
          score?: number | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "eazy_assessments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collection_items: {
        Row: {
          collection_id: string
          id: string
          position: number
          product_id: string
        }
        Insert: {
          collection_id: string
          id?: string
          position: number
          product_id: string
        }
        Update: {
          collection_id?: string
          id?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "product_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collection_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_collections: {
        Row: {
          caption: string
          created_at: string
          feed_position: number | null
          id: string
          is_published: boolean
          is_ranked: boolean
          lead_label: string
          signal: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          caption: string
          created_at?: string
          feed_position?: number | null
          id?: string
          is_published?: boolean
          is_ranked?: boolean
          lead_label: string
          signal?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          caption?: string
          created_at?: string
          feed_position?: number | null
          id?: string
          is_published?: boolean
          is_ranked?: boolean
          lead_label?: string
          signal?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_offers: {
        Row: {
          created_at: string
          currency: string
          id: string
          last_checked_at: string | null
          price: number | null
          product_id: string
          size: number | null
          size_region: string
          updated_at: string
          website_link: string
          website_name: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          last_checked_at?: string | null
          price?: number | null
          product_id: string
          size?: number | null
          size_region?: string
          updated_at?: string
          website_link: string
          website_name: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          last_checked_at?: string | null
          price?: number | null
          product_id?: string
          size?: number | null
          size_region?: string
          updated_at?: string
          website_link?: string
          website_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_offers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          name: string
          release_date: string | null
          size_type: string | null
          sku: string | null
          updated_at: string
        }
        Insert: {
          brand: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name: string
          release_date?: string | null
          size_type?: string | null
          sku?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          name?: string
          release_date?: string | null
          size_type?: string | null
          sku?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      rating_aggregates: {
        Row: {
          acquisition_ease_avg: number | null
          collection_avg: number | null
          comfort_avg: number | null
          craftsmanship_avg: number | null
          look_avg: number | null
          maintenance_avg: number | null
          material_avg: number | null
          methodology_version: string | null
          outfit_avg: number | null
          product_id: string
          rating_count: number
          resale_potential_avg: number | null
          score: number | null
          updated_at: string
          value_avg: number | null
        }
        Insert: {
          acquisition_ease_avg?: number | null
          collection_avg?: number | null
          comfort_avg?: number | null
          craftsmanship_avg?: number | null
          look_avg?: number | null
          maintenance_avg?: number | null
          material_avg?: number | null
          methodology_version?: string | null
          outfit_avg?: number | null
          product_id: string
          rating_count?: number
          resale_potential_avg?: number | null
          score?: number | null
          updated_at?: string
          value_avg?: number | null
        }
        Update: {
          acquisition_ease_avg?: number | null
          collection_avg?: number | null
          comfort_avg?: number | null
          craftsmanship_avg?: number | null
          look_avg?: number | null
          maintenance_avg?: number | null
          material_avg?: number | null
          methodology_version?: string | null
          outfit_avg?: number | null
          product_id?: string
          rating_count?: number
          resale_potential_avg?: number | null
          score?: number | null
          updated_at?: string
          value_avg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rating_aggregates_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_ratings: {
        Row: {
          acquisition_ease: number
          collection: number
          comfort: number
          craftsmanship: number
          created_at: string
          id: string
          look: number
          maintenance: number
          material: number
          methodology_version: string
          outfit: number
          private_note: string | null
          product_id: string
          resale_potential: number
          score: number
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          acquisition_ease: number
          collection: number
          comfort: number
          craftsmanship: number
          created_at?: string
          id?: string
          look: number
          maintenance: number
          material: number
          methodology_version?: string
          outfit: number
          private_note?: string | null
          product_id: string
          resale_potential: number
          score?: number
          updated_at?: string
          user_id: string
          value: number
        }
        Update: {
          acquisition_ease?: number
          collection?: number
          comfort?: number
          craftsmanship?: number
          created_at?: string
          id?: string
          look?: number
          maintenance?: number
          material?: number
          methodology_version?: string
          outfit?: number
          private_note?: string | null
          product_id?: string
          resale_potential?: number
          score?: number
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_ratings_product_id_fkey"
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
      compute_sneaker10_score: {
        Args: {
          p_acquisition_ease: number
          p_collection: number
          p_comfort: number
          p_craftsmanship: number
          p_look: number
          p_maintenance: number
          p_material: number
          p_outfit: number
          p_resale_potential: number
          p_value: number
        }
        Returns: number
      }
      is_half_step_score_0_10: { Args: { p_value: number }; Returns: boolean }
      refresh_rating_aggregates: {
        Args: { p_product_id: string }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
