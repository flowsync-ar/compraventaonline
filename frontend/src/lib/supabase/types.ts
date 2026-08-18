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
      advertisements: {
        Row: {
          active: boolean
          created_at: string
          end_date: string | null
          id: string
          image_url: string | null
          link_url: string | null
          placement: Database["public"]["Enums"]["ad_placement"]
          seller_id: string | null
          start_date: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          seller_id?: string | null
          start_date?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string | null
          id?: string
          image_url?: string | null
          link_url?: string | null
          placement?: Database["public"]["Enums"]["ad_placement"]
          seller_id?: string | null
          start_date?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "advertisements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          updated_at?: string
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
      currencies: {
        Row: {
          code: Database["public"]["Enums"]["currency_code"]
          created_at: string
          id: string
          name: string
          symbol: string
          updated_at: string
        }
        Insert: {
          code: Database["public"]["Enums"]["currency_code"]
          created_at?: string
          id?: string
          name: string
          symbol: string
          updated_at?: string
        }
        Update: {
          code?: Database["public"]["Enums"]["currency_code"]
          created_at?: string
          id?: string
          name?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          active: boolean
          created_at: string
          cta_label: string
          eyebrow: string
          href: string
          id: string
          image_url: string
          sort_order: number
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string
          eyebrow?: string
          href?: string
          id?: string
          image_url: string
          sort_order?: number
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string
          eyebrow?: string
          href?: string
          id?: string
          image_url?: string
          sort_order?: number
          title?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      highlighted_products: {
        Row: {
          active: boolean
          created_at: string
          end_date: string
          id: string
          listing_id: string
          seller_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date: string
          id?: string
          listing_id: string
          seller_id: string
          start_date?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string
          id?: string
          listing_id?: string
          seller_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlighted_products_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlighted_products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          condition: string
          created_at: string
          currency_id: string | null
          featured_plan: string
          id: string
          image_url: string | null
          price: number
          product_id: string
          seller_id: string
          status: Database["public"]["Enums"]["listing_status"]
          stock: number
          updated_at: string
        }
        Insert: {
          condition?: string
          created_at?: string
          currency_id?: string | null
          featured_plan?: string
          id?: string
          image_url?: string | null
          price: number
          product_id: string
          seller_id: string
          status?: Database["public"]["Enums"]["listing_status"]
          stock?: number
          updated_at?: string
        }
        Update: {
          condition?: string
          created_at?: string
          currency_id?: string | null
          featured_plan?: string
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string
          seller_id?: string
          status?: Database["public"]["Enums"]["listing_status"]
          stock?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listings_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          attributes: Json | null
          brand: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          name: string
          updated_at: string
        }
        Insert: {
          attributes?: Json | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name: string
          updated_at?: string
        }
        Update: {
          attributes?: Json | null
          brand?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          images?: string[] | null
          id?: string
          name?: string
          updated_at?: string
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
      questions: {
        Row: {
          answer: string | null
          buyer_id: string
          created_at: string
          id: string
          is_read_by_seller: boolean
          listing_id: string
          question: string
          status: Database["public"]["Enums"]["question_status"]
          updated_at: string
        }
        Insert: {
          answer?: string | null
          buyer_id: string
          created_at?: string
          id?: string
          is_read_by_seller?: boolean
          listing_id: string
          question: string
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
        }
        Update: {
          answer?: string | null
          buyer_id?: string
          created_at?: string
          id?: string
          is_read_by_seller?: boolean
          listing_id?: string
          question?: string
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_rewards: {
        Row: {
          claimed: boolean
          created_at: string
          expires_at: string | null
          id: string
          seller_id: string
          type: Database["public"]["Enums"]["reward_type"]
          updated_at: string
          value: number | null
        }
        Insert: {
          claimed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          seller_id: string
          type: Database["public"]["Enums"]["reward_type"]
          updated_at?: string
          value?: number | null
        }
        Update: {
          claimed?: boolean
          created_at?: string
          expires_at?: string | null
          id?: string
          seller_id?: string
          type?: Database["public"]["Enums"]["reward_type"]
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_rewards_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          document_number: string | null
          id: string
          location: string | null
          name: string
          phone: string | null
          rating: number | null
          score: number
          status: Database["public"]["Enums"]["seller_status"]
          tier: string
          type: Database["public"]["Enums"]["seller_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          document_number?: string | null
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          rating?: number | null
          score?: number
          status?: Database["public"]["Enums"]["seller_status"]
          tier?: string
          type?: Database["public"]["Enums"]["seller_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          document_number?: string | null
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          rating?: number | null
          score?: number
          status?: Database["public"]["Enums"]["seller_status"]
          tier?: string
          type?: Database["public"]["Enums"]["seller_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          seller_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          seller_id: string
          version?: string
        }
        Update: {
          accepted_at?: string
          id?: string
          seller_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ad_placement: "HOME_BANNER" | "SIDEBAR" | "LISTING_PAGE"
      currency_code: "ARS" | "USD"
      listing_status: "ACTIVE" | "APPROVED" | "PAUSED" | "SOLD" | "DELETED"
      question_status: "PENDING" | "ANSWERED"
      report_reason: "SPAM" | "FRAUD" | "INAPPROPRIATE" | "DUPLICATE" | "OTHER"
      reward_type: "HIGHLIGHT" | "DISCOUNT" | "FREE_LISTING"
      seller_status: "ACTIVE" | "SUSPENDED"
      seller_type: "PERSONAL_SELLER" | "BUSINESS_SELLER"
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

// ─── Convenience types ────────────────────────────────────────────────────────

export type SellerRow = Database["public"]["Tables"]["sellers"]["Row"]

export type QuestionWithBuyer =
  Database["public"]["Tables"]["questions"]["Row"] & {
    buyer: Pick<SellerRow, "id" | "name" | "avatar_url"> | null
    listing:
      | (Pick<Database["public"]["Tables"]["listings"]["Row"], "id"> & {
          product: Pick<Database["public"]["Tables"]["products"]["Row"], "name"> | null
        })
      | null
  }

export type ListingWithDetails =
  Database["public"]["Tables"]["listings"]["Row"] & {
    products:
      | (Database["public"]["Tables"]["products"]["Row"] & {
          categories: Pick<
            Database["public"]["Tables"]["categories"]["Row"],
            "id" | "name" | "slug"
          > | null
        })
      | null
    sellers: Pick<SellerRow, "id" | "name" | "score" | "tier" | "location"> | null
    currencies: Pick<
      Database["public"]["Tables"]["currencies"]["Row"],
      "id" | "code" | "symbol"
    > | null
  }

// ──────────────────────────────────────────────────────────────────────────────

export const Constants = {
  public: {
    Enums: {
      ad_placement: ["HOME_BANNER", "SIDEBAR", "LISTING_PAGE"],
      currency_code: ["ARS", "USD"],
      listing_status: ["ACTIVE", "APPROVED", "PAUSED", "SOLD", "DELETED"],
      question_status: ["PENDING", "ANSWERED"],
      report_reason: ["SPAM", "FRAUD", "INAPPROPRIATE", "DUPLICATE", "OTHER"],
      reward_type: ["HIGHLIGHT", "DISCOUNT", "FREE_LISTING"],
      seller_status: ["ACTIVE", "SUSPENDED"],
      seller_type: ["PERSONAL_SELLER", "BUSINESS_SELLER"],
    },
  },
} as const
