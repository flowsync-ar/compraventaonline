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
      category_suggestions: {
        Row: {
          created_at: string
          id: string
          seller_id: string
          status: string
          suggested_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          seller_id: string
          status?: string
          suggested_name: string
        }
        Update: {
          created_at?: string
          id?: string
          seller_id?: string
          status?: string
          suggested_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_suggestions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          status?: string
        }
        Relationships: []
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
          dark_overlay: boolean
          eyebrow: string
          href: string
          id: string
          image_fit: string
          image_url: string
          image_url_mobile: string | null
          show_cta: boolean
          sort_order: number
          title: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          cta_label?: string
          dark_overlay?: boolean
          eyebrow?: string
          href?: string
          id?: string
          image_fit?: string
          image_url: string
          image_url_mobile?: string | null
          show_cta?: boolean
          sort_order?: number
          title?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          cta_label?: string
          dark_overlay?: boolean
          eyebrow?: string
          href?: string
          id?: string
          image_fit?: string
          image_url?: string
          image_url_mobile?: string | null
          show_cta?: boolean
          sort_order?: number
          title?: string | null
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
          plan: string
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
          plan?: string
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
          plan?: string
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
      highlight_orders: {
        Row: {
          amount: number
          created_at: string
          duration_days: number
          id: string
          listing_id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          seller_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          duration_days?: number
          id?: string
          listing_id: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          duration_days?: number
          id?: string
          listing_id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "highlight_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "highlight_orders_seller_id_fkey"
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
          share_to_social: Database["public"]["Enums"]["social_platform"][] | null
          status: Database["public"]["Enums"]["listing_status"]
          stock: number
          updated_at: string
          price_risk: Database["public"]["Enums"]["price_risk_level"]
          price_risk_reasons: string[]
          price_seller_confirmed: boolean
          exclude_from_price_sort: boolean
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
          share_to_social?: Database["public"]["Enums"]["social_platform"][] | null
          status?: Database["public"]["Enums"]["listing_status"]
          stock?: number
          updated_at?: string
          price_risk?: Database["public"]["Enums"]["price_risk_level"]
          price_risk_reasons?: string[]
          price_seller_confirmed?: boolean
          exclude_from_price_sort?: boolean
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
          share_to_social?: Database["public"]["Enums"]["social_platform"][] | null
          status?: Database["public"]["Enums"]["listing_status"]
          stock?: number
          updated_at?: string
          price_risk?: Database["public"]["Enums"]["price_risk_level"]
          price_risk_reasons?: string[]
          price_seller_confirmed?: boolean
          exclude_from_price_sort?: boolean
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
          status: Database["public"]["Enums"]["report_moderation_status"]
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id: string
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_moderation_status"]
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["report_moderation_status"]
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
      listing_price_history: {
        Row: {
          created_at: string
          currency_id: string | null
          id: string
          listing_id: string
          new_price: number
          old_price: number | null
        }
        Insert: {
          created_at?: string
          currency_id?: string | null
          id?: string
          listing_id: string
          new_price: number
          old_price?: number | null
        }
        Update: {
          created_at?: string
          currency_id?: string | null
          id?: string
          listing_id?: string
          new_price?: number
          old_price?: number | null
        }
        Relationships: []
      }
      price_integrity_events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["price_integrity_event_type"]
          id: string
          listing_id: string | null
          reasons: string[]
          risk: Database["public"]["Enums"]["price_risk_level"] | null
          seller_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["price_integrity_event_type"]
          id?: string
          listing_id?: string | null
          reasons?: string[]
          risk?: Database["public"]["Enums"]["price_risk_level"] | null
          seller_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["price_integrity_event_type"]
          id?: string
          listing_id?: string | null
          reasons?: string[]
          risk?: Database["public"]["Enums"]["price_risk_level"] | null
          seller_id?: string | null
        }
        Relationships: []
      }
      seller_ratings: {
        Row: {
          buyer_id: string
          comment: string | null
          created_at: string
          id: string
          order_id: string
          rating: Database["public"]["Enums"]["buyer_rating_value"]
          respected_published_price: boolean | null
          seller_id: string
        }
        Insert: {
          buyer_id: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id: string
          rating: Database["public"]["Enums"]["buyer_rating_value"]
          respected_published_price?: boolean | null
          seller_id: string
        }
        Update: {
          buyer_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          order_id?: string
          rating?: Database["public"]["Enums"]["buyer_rating_value"]
          respected_published_price?: boolean | null
          seller_id?: string
        }
        Relationships: []
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
          answer_deleted: boolean
          buyer_id: string
          created_at: string
          hidden_by_seller: boolean
          id: string
          is_read_by_buyer: boolean
          is_read_by_seller: boolean
          listing_id: string
          question: string
          question_deleted: boolean
          status: Database["public"]["Enums"]["question_status"]
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answer_deleted?: boolean
          buyer_id: string
          created_at?: string
          hidden_by_seller?: boolean
          id?: string
          is_read_by_buyer?: boolean
          is_read_by_seller?: boolean
          listing_id: string
          question: string
          question_deleted?: boolean
          status?: Database["public"]["Enums"]["question_status"]
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answer_deleted?: boolean
          buyer_id?: string
          created_at?: string
          hidden_by_seller?: boolean
          id?: string
          is_read_by_buyer?: boolean
          is_read_by_seller?: boolean
          listing_id?: string
          question?: string
          question_deleted?: boolean
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
      page_views: {
        Row: {
          created_at: string
          id: string
          path: string
          visit_date: string
          visitor_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          visit_date?: string
          visitor_key: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          visit_date?: string
          visitor_key?: string
        }
        Relationships: []
      }
      listing_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          viewed_date: string
          viewer_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          viewed_date?: string
          viewer_key: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          viewed_date?: string
          viewer_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          }
        ]
      }
      seller_social_accounts: {
        Row: {
          access_token: string | null
          connected_at: string
          handle: string
          id: string
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token: string | null
          seller_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          handle: string
          id?: string
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          seller_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          handle?: string
          id?: string
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_social_accounts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          }
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
          bank_alias: string | null
          bank_cbu: string | null
          bio: string | null
          created_at: string
          document_number: string | null
          email: string
          id: string
          identity_verified: boolean
          highlight_free: boolean
          location: string | null
          mercadopago_connected: boolean
          name: string
          phone: string | null
          phone_verified: boolean
          rating: number | null
          score: number
          status: Database["public"]["Enums"]["seller_status"]
          tier: string
          type: Database["public"]["Enums"]["seller_type"]
          updated_at: string
          user_id: string
          username: string | null
          price_integrity_level: number
        }
        Insert: {
          avatar_url?: string | null
          bank_alias?: string | null
          bank_cbu?: string | null
          bio?: string | null
          created_at?: string
          document_number?: string | null
          email: string
          id?: string
          identity_verified?: boolean
          highlight_free?: boolean
          location?: string | null
          mercadopago_connected?: boolean
          name: string
          phone?: string | null
          phone_verified?: boolean
          rating?: number | null
          score?: number
          status?: Database["public"]["Enums"]["seller_status"]
          tier?: string
          type?: Database["public"]["Enums"]["seller_type"]
          updated_at?: string
          user_id: string
          username?: string | null
          price_integrity_level?: number
        }
        Update: {
          avatar_url?: string | null
          bank_alias?: string | null
          bank_cbu?: string | null
          bio?: string | null
          created_at?: string
          document_number?: string | null
          email?: string
          id?: string
          identity_verified?: boolean
          highlight_free?: boolean
          location?: string | null
          mercadopago_connected?: boolean
          name?: string
          phone?: string | null
          phone_verified?: boolean
          rating?: number | null
          score?: number
          status?: Database["public"]["Enums"]["seller_status"]
          tier?: string
          type?: Database["public"]["Enums"]["seller_type"]
          updated_at?: string
          user_id?: string
          username?: string | null
          price_integrity_level?: number
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          created_at: string
          face_match_score: number | null
          id: string
          raw_payload: Json | null
          seller_id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          face_match_score?: number | null
          id?: string
          raw_payload?: Json | null
          seller_id: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          face_match_score?: number | null
          id?: string
          raw_payload?: Json | null
          seller_id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          }
        ]
      }
      seller_mercadopago_accounts: {
        Row: {
          access_token: string | null
          connected_at: string | null
          created_at: string
          mp_user_id: string | null
          oauth_pending_code_verifier: string | null
          oauth_pending_created_at: string | null
          oauth_pending_state: string | null
          public_key: string | null
          refresh_token: string | null
          seller_id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          mp_user_id?: string | null
          oauth_pending_code_verifier?: string | null
          oauth_pending_created_at?: string | null
          oauth_pending_state?: string | null
          public_key?: string | null
          refresh_token?: string | null
          seller_id: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string | null
          created_at?: string
          mp_user_id?: string | null
          oauth_pending_code_verifier?: string | null
          oauth_pending_created_at?: string | null
          oauth_pending_state?: string | null
          public_key?: string | null
          refresh_token?: string | null
          seller_id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          admin_notes: string | null
          amount: number
          buyer_id: string
          created_at: string
          currency_id: string | null
          delivery_confirmed_at: string | null
          dispute_opened_at: string | null
          dispute_reason: string | null
          id: string
          listing_id: string
          mp_payment_id: string | null
          mp_preference_id: string | null
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["order_payment_method"]
          refunded_at: string | null
          release_deadline: string | null
          released_at: string | null
          seller_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          buyer_id: string
          created_at?: string
          currency_id?: string | null
          delivery_confirmed_at?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          id?: string
          listing_id: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          payment_method: Database["public"]["Enums"]["order_payment_method"]
          refunded_at?: string | null
          release_deadline?: string | null
          released_at?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          buyer_id?: string
          created_at?: string
          currency_id?: string | null
          delivery_confirmed_at?: string | null
          dispute_opened_at?: string | null
          dispute_reason?: string | null
          id?: string
          listing_id?: string
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["order_payment_method"]
          refunded_at?: string | null
          release_deadline?: string | null
          released_at?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: []
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: string | null
          seller_id: string
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          seller_id: string
          terms_version?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: string | null
          seller_id?: string
          terms_version?: string
          user_agent?: string | null
          user_id?: string
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
      price_adjustments: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          mode: string
          new_price: number
          old_price: number
          seller_id: string
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          mode: string
          new_price: number
          old_price: number
          seller_id: string
          value: number
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          mode?: string
          new_price?: number
          old_price?: number
          seller_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_adjustments_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_adjustments_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      site_metric_snapshots: {
        Row: {
          captured_at: string
          captured_at_art: string
          id: string
          label: string | null
          payload: Json
        }
        Insert: {
          captured_at?: string
          captured_at_art: string
          id?: string
          label?: string | null
          payload: Json
        }
        Update: {
          captured_at?: string
          captured_at_art?: string
          id?: string
          label?: string | null
          payload?: Json
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          highlight_duration_days: number
          highlight_price: number
          id: boolean
          maintenance_mode: boolean
          updated_at: string
        }
        Insert: {
          highlight_duration_days?: number
          highlight_price?: number
          id?: boolean
          maintenance_mode?: boolean
          updated_at?: string
        }
        Update: {
          highlight_duration_days?: number
          highlight_price?: number
          id?: boolean
          maintenance_mode?: boolean
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_storage_health: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      find_seller_identity_conflicts: {
        Args: {
          p_document_digits: string
          p_phone_digits: string
          p_seller_type: Database["public"]["Enums"]["seller_type"]
          p_exclude_user_id?: string | null
        }
        Returns: {
          document_taken: boolean
          phone_taken: boolean
        }[]
      }
    }
    Enums: {
      ad_placement: "HOME_BANNER" | "SIDEBAR" | "LISTING_PAGE"
      currency_code: "ARS" | "USD"
      listing_status: "ACTIVE" | "APPROVED" | "PAUSED" | "SOLD" | "DELETED"
      order_payment_method: "MERCADOPAGO" | "TRANSFER"
      order_status: "PENDING" | "PAID" | "CANCELLED" | "EN_CUSTODIA" | "LIBERADO" | "DISPUTADO" | "REEMBOLSADO"
      question_status: "PENDING" | "ANSWERED"
      buyer_rating_value: "POSITIVA" | "NEUTRAL" | "NEGATIVA"
      price_risk_level: "normal" | "warning" | "high"
      price_integrity_event_type: "WARNING_SHOWN" | "WARNING_ACCEPTED" | "WARNING_EDITED" | "HIGH_RISK_DETECTED" | "SELLER_CONFIRMED"
      report_moderation_status: "PENDING" | "CONFIRMED" | "REJECTED"
      report_reason: "SPAM" | "FRAUD" | "INAPPROPRIATE" | "DUPLICATE" | "OTHER" | "MISLEADING_PRICE"
      reward_type: "HIGHLIGHT" | "DISCOUNT" | "FREE_LISTING"
      seller_status: "ACTIVE" | "SUSPENDED"
      seller_type: "PERSONAL_SELLER" | "BUSINESS_SELLER"
      social_platform: "INSTAGRAM" | "FACEBOOK" | "TIKTOK"
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

// A question the current user asked (as buyer) that a seller has since
// answered — used for the "your question got answered" notification.
export type AnsweredQuestionForBuyer = Pick<
  Database["public"]["Tables"]["questions"]["Row"],
  "id" | "question" | "answer" | "updated_at"
> & {
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
      order_payment_method: ["MERCADOPAGO", "TRANSFER"],
      order_status: ["PENDING", "PAID", "CANCELLED", "EN_CUSTODIA", "LIBERADO", "DISPUTADO", "REEMBOLSADO"],
      question_status: ["PENDING", "ANSWERED"],
      report_reason: ["SPAM", "FRAUD", "INAPPROPRIATE", "DUPLICATE", "OTHER", "MISLEADING_PRICE"],
      reward_type: ["HIGHLIGHT", "DISCOUNT", "FREE_LISTING"],
      seller_status: ["ACTIVE", "SUSPENDED"],
      seller_type: ["PERSONAL_SELLER", "BUSINESS_SELLER"],
      social_platform: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
    },
  },
} as const
