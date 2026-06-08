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
    PostgrestVersion: "13.0.5"
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
      course_sessions: {
        Row: {
          course_id: string
          created_at: string | null
          end_time: string | null
          id: string
          notes: string | null
          session_date: string
          session_number: number
          start_time: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          session_date: string
          session_number: number
          start_time: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          end_time?: string | null
          id?: string
          notes?: string | null
          session_date?: string
          session_number?: number
          start_time?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_signup_packages: {
        Row: {
          audience: Database["public"]["Enums"]["ticket_audience_t"]
          course_id: string
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_default: boolean
          label: string
          max_quantity: number | null
          price: number
          sales_ends_at: string | null
          sales_starts_at: string | null
          ticket_kind: Database["public"]["Enums"]["ticket_kind_t"]
          updated_at: string | null
          weeks: number | null
        }
        Insert: {
          audience?: Database["public"]["Enums"]["ticket_audience_t"]
          course_id: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          label: string
          max_quantity?: number | null
          price: number
          sales_ends_at?: string | null
          sales_starts_at?: string | null
          ticket_kind?: Database["public"]["Enums"]["ticket_kind_t"]
          updated_at?: string | null
          weeks?: number | null
        }
        Update: {
          audience?: Database["public"]["Enums"]["ticket_audience_t"]
          course_id?: string
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_default?: boolean
          label?: string
          max_quantity?: number | null
          price?: number
          sales_ends_at?: string | null
          sales_starts_at?: string | null
          ticket_kind?: Database["public"]["Enums"]["ticket_kind_t"]
          updated_at?: string | null
          weeks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_signup_packages_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_team_listings: {
        Row: {
          course_id: string
          created_at: string
          team_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          team_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_team_listings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_team_listings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          accepts_late_signups: boolean
          created_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          description: string | null
          duration: number | null
          end_date: string | null
          format: Database["public"]["Enums"]["course_format"]
          id: string
          idempotency_key: string | null
          image_url: string | null
          instructor_id: string | null
          instructor_name: string | null
          location: string | null
          location_lat: number | null
          location_lon: number | null
          location_place_id: string | null
          max_participants: number | null
          price: number | null
          seller_id: string
          slug: string
          start_date: string | null
          status: Database["public"]["Enums"]["course_status"]
          time_schedule: string | null
          title: string
          total_weeks: number | null
          updated_at: string | null
        }
        Insert: {
          accepts_late_signups?: boolean
          created_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description?: string | null
          duration?: number | null
          end_date?: string | null
          format?: Database["public"]["Enums"]["course_format"]
          id?: string
          idempotency_key?: string | null
          image_url?: string | null
          instructor_id?: string | null
          instructor_name?: string | null
          location?: string | null
          location_lat?: number | null
          location_lon?: number | null
          location_place_id?: string | null
          max_participants?: number | null
          price?: number | null
          seller_id: string
          slug: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          time_schedule?: string | null
          title: string
          total_weeks?: number | null
          updated_at?: string | null
        }
        Update: {
          accepts_late_signups?: boolean
          created_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          description?: string | null
          duration?: number | null
          end_date?: string | null
          format?: Database["public"]["Enums"]["course_format"]
          id?: string
          idempotency_key?: string | null
          image_url?: string | null
          instructor_id?: string | null
          instructor_name?: string | null
          location?: string | null
          location_lat?: number | null
          location_lon?: number | null
          location_place_id?: string | null
          max_participants?: number | null
          price?: number | null
          seller_id?: string
          slug?: string
          start_date?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          time_schedule?: string | null
          title?: string
          total_weeks?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_required: boolean
          action_url: string
          actor_id: string | null
          archived_at: string | null
          body: string | null
          created_at: string
          dedupe_key: string | null
          id: number
          metadata: Json
          read_at: string | null
          recipient_id: string
          resolved_at: string | null
          seen_at: string | null
          seller_id: string
          title: string
          type: string
        }
        Insert: {
          action_required?: boolean
          action_url: string
          actor_id?: string | null
          archived_at?: string | null
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: never
          metadata?: Json
          read_at?: string | null
          recipient_id: string
          resolved_at?: string | null
          seen_at?: string | null
          seller_id: string
          title: string
          type: string
        }
        Update: {
          action_required?: boolean
          action_url?: string
          actor_id?: string | null
          archived_at?: string | null
          body?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: never
          metadata?: Json
          read_at?: string | null
          recipient_id?: string
          resolved_at?: string | null
          seen_at?: string | null
          seller_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_attempts: {
        Row: {
          base_price_nok: number
          course_id: string
          course_session_id: string | null
          created_at: string
          dintero_session_id: string | null
          dintero_transaction_id: string | null
          existing_signup_id: string | null
          id: string
          note: string | null
          participant_email: string
          participant_name: string
          participant_phone: string | null
          payment_product: string | null
          seller_id: string
          service_fee_nok: number
          status: string
          ticket_audience_snapshot:
            | Database["public"]["Enums"]["ticket_audience_t"]
            | null
          ticket_kind_snapshot:
            | Database["public"]["Enums"]["ticket_kind_t"]
            | null
          ticket_label_snapshot: string | null
          ticket_type_id: string | null
          total_price_nok: number
          updated_at: string
        }
        Insert: {
          base_price_nok: number
          course_id: string
          course_session_id?: string | null
          created_at?: string
          dintero_session_id?: string | null
          dintero_transaction_id?: string | null
          existing_signup_id?: string | null
          id?: string
          note?: string | null
          participant_email: string
          participant_name: string
          participant_phone?: string | null
          payment_product?: string | null
          seller_id: string
          service_fee_nok?: number
          status?: string
          ticket_audience_snapshot?:
            | Database["public"]["Enums"]["ticket_audience_t"]
            | null
          ticket_kind_snapshot?:
            | Database["public"]["Enums"]["ticket_kind_t"]
            | null
          ticket_label_snapshot?: string | null
          ticket_type_id?: string | null
          total_price_nok: number
          updated_at?: string
        }
        Update: {
          base_price_nok?: number
          course_id?: string
          course_session_id?: string | null
          created_at?: string
          dintero_session_id?: string | null
          dintero_transaction_id?: string | null
          existing_signup_id?: string | null
          id?: string
          note?: string | null
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
          payment_product?: string | null
          seller_id?: string
          service_fee_nok?: number
          status?: string
          ticket_audience_snapshot?:
            | Database["public"]["Enums"]["ticket_audience_t"]
            | null
          ticket_kind_snapshot?:
            | Database["public"]["Enums"]["ticket_kind_t"]
            | null
          ticket_label_snapshot?: string | null
          ticket_type_id?: string | null
          total_price_nok?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_course_session_id_fkey"
            columns: ["course_session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_existing_signup_id_fkey"
            columns: ["existing_signup_id"]
            isOneToOne: false
            referencedRelation: "signups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "course_signup_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_log: {
        Row: {
          changed_at: string
          id: string
          new_status: Database["public"]["Enums"]["payment_status"]
          old_status: Database["public"]["Enums"]["payment_status"] | null
          seller_id: string
          signup_id: string
          via_external: boolean
        }
        Insert: {
          changed_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["payment_status"]
          old_status?: Database["public"]["Enums"]["payment_status"] | null
          seller_id: string
          signup_id: string
          via_external: boolean
        }
        Update: {
          changed_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["payment_status"]
          old_status?: Database["public"]["Enums"]["payment_status"] | null
          seller_id?: string
          signup_id?: string
          via_external?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "payment_audit_log_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_audit_log_signup_id_fkey"
            columns: ["signup_id"]
            isOneToOne: false
            referencedRelation: "signups"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_webhook_events: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string | null
          result: Json | null
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string | null
          result?: Json | null
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string | null
          result?: Json | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_platform_admin: boolean | null
          name: string | null
          onboarding_completed_at: string | null
          phone: string | null
          role: string | null
          setup_complete_seen_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          is_platform_admin?: boolean | null
          name?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: string | null
          setup_complete_seen_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_platform_admin?: boolean | null
          name?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          role?: string | null
          setup_complete_seen_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          bucket_key: string
          hit_count: number
          window_start: string
        }
        Insert: {
          bucket_key: string
          hit_count?: number
          window_start?: string
        }
        Update: {
          bucket_key?: string
          hit_count?: number
          window_start?: string
        }
        Relationships: []
      }
      seller_members: {
        Row: {
          created_at: string | null
          role: Database["public"]["Enums"]["seller_member_role"]
          seller_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["seller_member_role"]
          seller_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role?: Database["public"]["Enums"]["seller_member_role"]
          seller_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_members_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          closed_at: string | null
          created_at: string | null
          dintero_approval_id: string | null
          dintero_contract_url: string | null
          dintero_onboarding_complete: boolean
          dintero_onboarding_status: string | null
          dintero_seller_id: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          organization_number: string | null
          phone: string | null
          seller_type: string
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string | null
          dintero_approval_id?: string | null
          dintero_contract_url?: string | null
          dintero_onboarding_complete?: boolean
          dintero_onboarding_status?: string | null
          dintero_seller_id?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          organization_number?: string | null
          phone?: string | null
          seller_type?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string | null
          dintero_approval_id?: string | null
          dintero_contract_url?: string | null
          dintero_onboarding_complete?: boolean
          dintero_onboarding_status?: string | null
          dintero_seller_id?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          organization_number?: string | null
          phone?: string | null
          seller_type?: string
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      signups: {
        Row: {
          amount_paid: number | null
          buyer_id: string | null
          cancelled_at: string | null
          confirmation_sent_at: string | null
          course_id: string
          course_session_id: string | null
          created_at: string | null
          dintero_merchant_reference: string | null
          dintero_session_id: string | null
          dintero_transaction_id: string | null
          id: string
          note: string | null
          package_end_date: string | null
          participant_email: string
          participant_name: string
          participant_phone: string | null
          payment_product: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          refund_amount: number | null
          refunded_at: string | null
          seller_id: string
          seller_notified_at: string | null
          status: Database["public"]["Enums"]["signup_status"]
          ticket_audience_snapshot: Database["public"]["Enums"]["ticket_audience_t"]
          ticket_kind_snapshot: Database["public"]["Enums"]["ticket_kind_t"]
          ticket_label_snapshot: string
          ticket_type_id: string
          updated_at: string | null
        }
        Insert: {
          amount_paid?: number | null
          buyer_id?: string | null
          cancelled_at?: string | null
          confirmation_sent_at?: string | null
          course_id: string
          course_session_id?: string | null
          created_at?: string | null
          dintero_merchant_reference?: string | null
          dintero_session_id?: string | null
          dintero_transaction_id?: string | null
          id?: string
          note?: string | null
          package_end_date?: string | null
          participant_email: string
          participant_name: string
          participant_phone?: string | null
          payment_product?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_id: string
          seller_notified_at?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          ticket_audience_snapshot: Database["public"]["Enums"]["ticket_audience_t"]
          ticket_kind_snapshot: Database["public"]["Enums"]["ticket_kind_t"]
          ticket_label_snapshot: string
          ticket_type_id: string
          updated_at?: string | null
        }
        Update: {
          amount_paid?: number | null
          buyer_id?: string | null
          cancelled_at?: string | null
          confirmation_sent_at?: string | null
          course_id?: string
          course_session_id?: string | null
          created_at?: string | null
          dintero_merchant_reference?: string | null
          dintero_session_id?: string | null
          dintero_transaction_id?: string | null
          id?: string
          note?: string | null
          package_end_date?: string | null
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
          payment_product?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_id?: string
          seller_notified_at?: string | null
          status?: Database["public"]["Enums"]["signup_status"]
          ticket_audience_snapshot?: Database["public"]["Enums"]["ticket_audience_t"]
          ticket_kind_snapshot?: Database["public"]["Enums"]["ticket_kind_t"]
          ticket_label_snapshot?: string
          ticket_type_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signups_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signups_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signups_course_session_id_fkey"
            columns: ["course_session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signups_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signups_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "course_signup_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_locations: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          rooms: Json
          lat: number | null
          lon: number | null
          google_place_id: string | null
          seller_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          rooms?: Json
          lat?: number | null
          lon?: number | null
          google_place_id?: string | null
          seller_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          rooms?: Json
          lat?: number | null
          lon?: number | null
          google_place_id?: string | null
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_locations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      team_affiliations: {
        Row: {
          invited_at: string
          invited_by: string | null
          responded_at: string | null
          seller_id: string
          status: string
          team_id: string
        }
        Insert: {
          invited_at?: string
          invited_by?: string | null
          responded_at?: string | null
          seller_id: string
          status: string
          team_id: string
        }
        Update: {
          invited_at?: string
          invited_by?: string | null
          responded_at?: string | null
          seller_id?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_affiliations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_affiliations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_affiliations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invite_links: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          revoked_at: string | null
          team_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked_at?: string | null
          team_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          revoked_at?: string | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invite_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_slug_aliases: {
        Row: {
          archived_at: string
          old_slug: string
          team_id: string
        }
        Insert: {
          archived_at?: string
          old_slug: string
          team_id: string
        }
        Update: {
          archived_at?: string
          old_slug?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_slug_aliases_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          cover_image_url: string | null
          created_at: string
          default_course_image_url: string | null
          id: string
          name: string
          owner_seller_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          default_course_image_url?: string | null
          id?: string
          name: string
          owner_seller_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          default_course_image_url?: string | null
          id?: string
          name?: string
          owner_seller_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_seller_id_fkey"
            columns: ["owner_seller_id"]
            isOneToOne: true
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _account_deletion_blockers: { Args: { p_user_id: string }; Returns: Json }
      _course_runs_today_or_later: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      _normalize_team_slug: { Args: { p_input: string }; Returns: string }
      _seller_has_unfinished_business: {
        Args: { p_seller_id: string }
        Returns: boolean
      }
      account_deletion_preflight: { Args: never; Returns: Json }
      available_ticket_types: {
        Args: { p_course_id: string }
        Returns: {
          audience: Database["public"]["Enums"]["ticket_audience_t"]
          course_id: string
          description: string
          display_order: number
          id: string
          is_default: boolean
          label: string
          max_quantity: number
          price: number
          sales_ends_at: string
          sales_starts_at: string
          seats_remaining: number
          ticket_kind: Database["public"]["Enums"]["ticket_kind_t"]
          weeks: number
        }[]
      }
      calculate_package_end_date: {
        Args: { p_course_start_date: string; p_package_weeks: number }
        Returns: string
      }
      check_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_seconds: number }
        Returns: boolean
      }
      check_session_conflict: {
        Args: {
          p_end_time: string
          p_exclude_course_id?: string
          p_seller_id: string
          p_session_date: string
          p_start_time: string
        }
        Returns: {
          conflicting_course_id: string
          conflicting_course_title: string
          conflicting_end: string
          conflicting_start: string
          has_conflict: boolean
        }[]
      }
      check_sessions_conflicts: {
        Args: {
          p_exclude_course_id?: string
          p_seller_id: string
          p_sessions: Json
        }
        Returns: {
          conflicting_course_id: string
          conflicting_course_title: string
          conflicting_end: string
          conflicting_start: string
          has_conflict: boolean
          session_date: string
        }[]
      }
      cleanup_old_webhook_events: { Args: never; Returns: number }
      cleanup_rate_limit_buckets: { Args: never; Returns: undefined }
      close_and_anonymize_seller: {
        Args: { p_seller_id: string }
        Returns: undefined
      }
      complete_buyer_onboarding: {
        Args: { p_name: string; p_phone?: string }
        Returns: {
          created_at: string | null
          email: string
          id: string
          is_platform_admin: boolean | null
          name: string | null
          onboarding_completed_at: string | null
          phone: string | null
          role: string | null
          setup_complete_seen_at: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      count_signups_by_ticket_type: {
        Args: { p_course_id: string; p_ticket_type_id: string }
        Returns: number
      }
      count_signups_for_session: {
        Args: { p_course_session_id: string }
        Returns: number
      }
      create_course_idempotent: {
        Args: {
          p_delivery_mode?: string
          p_description?: string
          p_duration?: number
          p_end_date?: string
          p_format?: string
          p_idempotency_key: string
          p_image_url?: string
          p_instructor_id?: string
          p_level?: string
          p_location?: string
          p_max_participants?: number
          p_price?: number
          p_seller_id: string
          p_start_date?: string
          p_status?: string
          p_style_id?: string
          p_time_schedule?: string
          p_title: string
          p_total_weeks?: number
        }
        Returns: Json
      }
      create_signup_if_available:
        | {
            Args: {
              p_amount_paid: number
              p_buyer_id?: string
              p_course_id: string
              p_course_session_id?: string
              p_dintero_merchant_reference: string
              p_dintero_session_id: string
              p_dintero_transaction_id: string
              p_participant_email: string
              p_participant_name: string
              p_participant_phone: string
              p_seller_id: string
              p_ticket_type_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_amount_paid: number
              p_buyer_id?: string
              p_course_id: string
              p_course_session_id?: string
              p_dintero_merchant_reference: string
              p_dintero_session_id: string
              p_dintero_transaction_id: string
              p_note?: string
              p_participant_email: string
              p_participant_name: string
              p_participant_phone: string
              p_payment_product?: string
              p_seller_id: string
              p_ticket_type_id: string
            }
            Returns: Json
          }
      create_team_invite_link: {
        Args: { p_team_id: string }
        Returns: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          revoked_at: string | null
          team_id: string
        }
        SetofOptions: {
          from: "*"
          to: "team_invite_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_course_cascade: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      ensure_seller_for_user: {
        Args: {
          p_seller_name: string
          p_seller_type?: string
          p_team_slug: string
        }
        Returns: {
          member_role: Database["public"]["Enums"]["seller_member_role"]
          seller_id: string
          seller_name: string
          team_id: string
          team_slug: string
          was_created: boolean
        }[]
      }
      get_seller_operational: {
        Args: { p_seller_id: string }
        Returns: {
          dintero_onboarding_status: string
          dintero_seller_id: string
          seller_type: string
          updated_at: string
        }[]
      }
      get_seller_private: {
        Args: { p_seller_id: string }
        Returns: {
          dintero_approval_id: string
          dintero_contract_url: string
          organization_number: string
          phone: string
        }[]
      }
      get_signup_by_dintero_id: {
        Args: { p_merchant_reference?: string; p_transaction_id?: string }
        Returns: Json
      }
      is_platform_admin: { Args: { user_uuid: string }; Returns: boolean }
      is_seller_member: {
        Args: { p_seller_id: string; p_user_id: string }
        Returns: boolean
      }
      is_seller_owner: {
        Args: { p_seller_id: string; p_user_id: string }
        Returns: boolean
      }
      is_team_admin: {
        Args: { p_team_id: string; p_user_id: string }
        Returns: boolean
      }
      lookup_team_invite_link: {
        Args: { p_code: string }
        Returns: {
          status: string
          team_cover_image_url: string
          team_id: string
          team_name: string
          team_slug: string
        }[]
      }
      mark_seller_onboarding_complete: {
        Args: never
        Returns: {
          created_at: string | null
          email: string
          id: string
          is_platform_admin: boolean | null
          name: string | null
          onboarding_completed_at: string | null
          phone: string | null
          role: string | null
          setup_complete_seen_at: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      public_signup_counts: {
        Args: { p_course_ids: string[] }
        Returns: {
          confirmed_count: number
          course_id: string
        }[]
      }
      public_storefront_seller_ids: {
        Args: { p_team_slug: string }
        Returns: {
          owner_seller_id: string
          seller_id: string
          team_id: string
        }[]
      }
      reconcile_course_lifecycle: { Args: never; Returns: number }
      redeem_team_invite_link: {
        Args: { p_code: string; p_force_leave?: boolean }
        Returns: {
          existing_team_id: string
          status: string
          team_id: string
        }[]
      }
      rename_team_slug: {
        Args: { p_new_slug: string; p_team_id: string }
        Returns: string
      }
      set_user_role: {
        Args: { p_role: string }
        Returns: {
          created_at: string | null
          email: string
          id: string
          is_platform_admin: boolean | null
          name: string | null
          onboarding_completed_at: string | null
          phone: string | null
          role: string | null
          setup_complete_seen_at: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      storage_can_write_course_image: {
        Args: { p_object_name: string }
        Returns: boolean
      }
      storage_can_write_seller_logo: {
        Args: { p_object_name: string }
        Returns: boolean
      }
    }
    Enums: {
      course_format: "single" | "series"
      course_status: "draft" | "upcoming" | "active" | "completed" | "cancelled"
      delivery_mode: "in_person" | "online"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      seller_member_role: "owner" | "admin"
      signup_status: "confirmed" | "cancelled" | "course_cancelled"
      ticket_audience_t: "standard" | "student" | "senior" | "staff"
      ticket_kind_t: "package" | "drop_in" | "pass"
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
      course_format: ["single", "series"],
      course_status: ["draft", "upcoming", "active", "completed", "cancelled"],
      delivery_mode: ["in_person", "online"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      seller_member_role: ["owner", "admin"],
      signup_status: ["confirmed", "cancelled", "course_cancelled"],
      ticket_audience_t: ["standard", "student", "senior", "staff"],
      ticket_kind_t: ["package", "drop_in", "pass"],
    },
  },
} as const

// Local convenience aliases used throughout the app. Supabase regenerates the
// schema shape above; keep these lightweight exports in sync with it.
export type Profile = Tables<"profiles">
export type Seller = Tables<"sellers">
export type SellerUpdate = TablesUpdate<"sellers">
export type Team = Tables<"teams">
export type Course = Tables<"courses">
export type CourseInsert = TablesInsert<"courses">
export type CourseUpdate = TablesUpdate<"courses">
export type CourseSession = Tables<"course_sessions">
export type CourseSessionInsert = TablesInsert<"course_sessions">
export type CourseSessionUpdate = TablesUpdate<"course_sessions">
export type Signup = Tables<"signups">
export type SignupInsert = TablesInsert<"signups">
export type TeacherLocation = Tables<"teacher_locations">
export type TeacherLocationInsert = TablesInsert<"teacher_locations">
export type TeacherLocationUpdate = TablesUpdate<"teacher_locations">
export type TeamAffiliation = Tables<"team_affiliations">
export type TeamInviteLink = Tables<"team_invite_links">
export type Notification = Tables<"notifications">

export type CourseFormat = Enums<"course_format">
export type CourseStatus = Enums<"course_status">
export type DeliveryMode = Enums<"delivery_mode">
export type PaymentStatus = Enums<"payment_status">
export type SellerMemberRole = Enums<"seller_member_role">
export type SignupStatus = Enums<"signup_status">
export type TicketAudience = Enums<"ticket_audience_t">
export type TicketKind = Enums<"ticket_kind_t">

export type SessionStatus = "upcoming" | "completed" | "cancelled"
export type TeamAffiliationStatus = "pending" | "active" | "declined"
export type UserRole = "buyer" | "seller"
export type ExceptionType = "payment_failed" | "pending_payment"
export type NotificationType =
  | "booking.created"
  | "booking.waitlist_promoted"
  | "payment.failed"
  | "refund.completed"
  | "payout.sent"
  | "dintero_seller.action_required"
  | "dintero_seller.approved"
  | "dintero_seller.rejected"
  | "team.invite_accepted"

export type AvailableTicketType =
  Database["public"]["Functions"]["available_ticket_types"]["Returns"][number]
export type LookupTeamInviteLinkResult =
  Database["public"]["Functions"]["lookup_team_invite_link"]["Returns"][number]
export type RedeemTeamInviteLinkResult =
  Database["public"]["Functions"]["redeem_team_invite_link"]["Returns"][number]
