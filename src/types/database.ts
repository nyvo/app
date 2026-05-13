/**
 * Auto-generated Supabase types + convenience aliases.
 *
 * Regenerate with: supabase gen types typescript --project-id nollnnkksgicsvuthnjq
 * Last generated: 2026-04-28 (post-YAGNI cleanup)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types matching the database
export type CourseFormat = 'single' | 'series'
export type DeliveryMode = 'in_person' | 'online'
export type CourseStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
export type SignupStatus = 'confirmed' | 'cancelled' | 'course_cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type SellerMemberRole = 'owner' | 'admin'
export type CourseLevel = 'alle' | 'nybegynner' | 'viderekommen'
export type SessionStatus = 'upcoming' | 'completed' | 'cancelled'
export type ExceptionType = 'payment_failed' | 'pending_payment'
// Ticket-type model — every priced unit (course, package, drop-in) is a row in
// course_signup_packages, distinguished by ticket_kind.
export type TicketKind = 'package' | 'drop_in' | 'pass'
export type TicketAudience = 'standard' | 'student' | 'senior' | 'staff'

// Seller's legal entity model.
export type SellerType = 'individual' | 'business'
export type UserRole = 'buyer' | 'seller'

// Storefront syndication: a venue/studio team invites a freelancer seller to
// advertise their courses. 'pending' = awaiting freelancer response.
export type TeamAffiliationStatus = 'pending' | 'active' | 'declined'

// Display type for signup rows (participant-first view)
export interface SignupDisplay {
  id: string;
  courseId: string;
  participantName: string;
  participantEmail: string;
  className: string;
  classDate: string;
  classTime: string;
  classDateTime: Date;
  registeredAt: string;
  registeredAtDate: Date;
  status: SignupStatus;
  paymentStatus: PaymentStatus;
  note?: string;
  amountPaid?: number | null;
  dinteroTransactionId?: string | null;
  sellerId?: string;
  exceptionType?: ExceptionType | null;
  courseEnded?: boolean;
  courseEndDate?: string | null;
  courseCapacity?: number | null;
  // Ticket-type info — what the participant actually bought.
  ticketLabel?: string;
  ticketKind?: TicketKind;
  ticketAudience?: TicketAudience;
  // Course shape, used for the meta line.
  courseFormat?: CourseFormat;
  deliveryMode?: DeliveryMode;
  courseStartDate?: string | null;
  courseTotalWeeks?: number | null;
}

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
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
          level: Database["public"]["Enums"]["course_level"] | null
          location: string | null
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
          level?: Database["public"]["Enums"]["course_level"] | null
          location?: string | null
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
          level?: Database["public"]["Enums"]["course_level"] | null
          location?: string | null
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
          participant_email: string
          participant_name: string
          participant_phone: string | null
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
          participant_email: string
          participant_name: string
          participant_phone?: string | null
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
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
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
            foreignKeyName: "payment_attempts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_log: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: Database["public"]["Enums"]["payment_status"]
          old_status: Database["public"]["Enums"]["payment_status"] | null
          seller_id: string
          signup_id: string
          via_external: boolean
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: Database["public"]["Enums"]["payment_status"]
          old_status?: Database["public"]["Enums"]["payment_status"] | null
          seller_id: string
          signup_id: string
          via_external: boolean
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: Database["public"]["Enums"]["payment_status"]
          old_status?: Database["public"]["Enums"]["payment_status"] | null
          seller_id?: string
          signup_id?: string
          via_external?: boolean
        }
        Relationships: []
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
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          refund_amount: number | null
          refunded_at: string | null
          seller_id: string
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
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_id: string
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
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_id?: string
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
          is_favorite: boolean
          name: string
          rooms: string[]
          seller_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          name: string
          rooms?: string[]
          seller_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_favorite?: boolean
          name?: string
          rooms?: string[]
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
          invited_by: string
          responded_at: string | null
          seller_id: string
          status: string
          team_id: string
        }
        Insert: {
          invited_at?: string
          invited_by: string
          responded_at?: string | null
          seller_id: string
          status: string
          team_id: string
        }
        Update: {
          invited_at?: string
          invited_by?: string
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
          expires_at: string
          id: string
          revoked_at: string | null
          team_id: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          revoked_at?: string | null
          team_id: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
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
      team_members: {
        Row: {
          joined_at: string
          role: string
          seller_id: string
          team_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          seller_id: string
          team_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          seller_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
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
          invite_code: string
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
          invite_code: string
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
          invite_code?: string
          name?: string
          owner_seller_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_seller_id_fkey"
            columns: ["owner_seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
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
      ensure_seller_for_user: {
        Args: { p_seller_name: string; p_seller_type?: string; p_team_slug: string }
        Returns: {
          member_role: Database["public"]["Enums"]["seller_member_role"]
          seller_id: string
          seller_name: string
          team_id: string
          team_slug: string
          was_created: boolean
        }[]
      }
      lookup_team_invite_link: {
        Args: { p_code: string }
        Returns: {
          status: string
          team_id: string | null
          team_slug: string | null
          team_name: string | null
          team_cover_image_url: string | null
        }[]
      }
      create_team_invite_link: {
        Args: { p_team_id: string; p_expires_days?: number }
        Returns: Database["public"]["Tables"]["team_invite_links"]["Row"]
      }
      redeem_team_invite_link: {
        Args: { p_code: string; p_force_leave?: boolean }
        Returns: {
          status: string
          team_id: string | null
          existing_team_id: string | null
        }[]
      }
    }
    Enums: {
      course_format: "single" | "series"
      course_level: "alle" | "nybegynner" | "viderekommen"
      course_status: "draft" | "upcoming" | "active" | "completed" | "cancelled"
      delivery_mode: "in_person" | "online"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      seller_member_role: "owner" | "admin"
      signup_status: "confirmed" | "cancelled" | "course_cancelled"
      ticket_audience_t: "standard" | "student" | "senior" | "staff"
      ticket_kind_t: "package" | "drop_in" | "pass"
    }
    CompositeTypes: { [_ in never]: never }
  }
}

// ============================================================================
// Convenience aliases
// ============================================================================

export type Seller = Database['public']['Tables']['sellers']['Row']
export type SellerInsert = Database['public']['Tables']['sellers']['Insert']
export type SellerUpdate = Database['public']['Tables']['sellers']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type SellerMember = Database['public']['Tables']['seller_members']['Row']
export type SellerMemberInsert = Database['public']['Tables']['seller_members']['Insert']
export type SellerMemberUpdate = Database['public']['Tables']['seller_members']['Update']

export type Course = Database['public']['Tables']['courses']['Row']
export type CourseInsert = Database['public']['Tables']['courses']['Insert']
export type CourseUpdate = Database['public']['Tables']['courses']['Update']

export type Signup = Database['public']['Tables']['signups']['Row']
export type SignupInsert = Database['public']['Tables']['signups']['Insert']
export type SignupUpdate = Database['public']['Tables']['signups']['Update']

export type CourseSession = Database['public']['Tables']['course_sessions']['Row']
export type CourseSessionInsert = Database['public']['Tables']['course_sessions']['Insert']
export type CourseSessionUpdate = Database['public']['Tables']['course_sessions']['Update']

export type CourseSignupPackage = Database['public']['Tables']['course_signup_packages']['Row']
export type CourseSignupPackageInsert = Database['public']['Tables']['course_signup_packages']['Insert']
export type CourseSignupPackageUpdate = Database['public']['Tables']['course_signup_packages']['Update']

// Friendlier alias — the schema is `course_signup_packages`, but the mental
// model is ticket types. Prefer TicketType in new code.
export type TicketType = CourseSignupPackage
export type TicketTypeInsert = CourseSignupPackageInsert
export type TicketTypeUpdate = CourseSignupPackageUpdate

// What `available_ticket_types(course_id)` returns — adds seats_remaining.
export type AvailableTicketType =
  Database['public']['Functions']['available_ticket_types']['Returns'][number]

export type PaymentAttempt = Database['public']['Tables']['payment_attempts']['Row']
export type PaymentAttemptInsert = Database['public']['Tables']['payment_attempts']['Insert']
export type PaymentAttemptUpdate = Database['public']['Tables']['payment_attempts']['Update']

export type TeacherLocation = Database['public']['Tables']['teacher_locations']['Row']
export type TeacherLocationInsert = Database['public']['Tables']['teacher_locations']['Insert']
export type TeacherLocationUpdate = Database['public']['Tables']['teacher_locations']['Update']

export type Team = Database['public']['Tables']['teams']['Row']
export type TeamInsert = Database['public']['Tables']['teams']['Insert']
export type TeamUpdate = Database['public']['Tables']['teams']['Update']

// Storefront syndication. team_affiliations: studio invites freelancer seller.
// course_team_listings: per-course opt-in once affiliation is active.
// See migration 20260429_team_affiliations_and_course_listings.sql.
export type TeamAffiliation = Database['public']['Tables']['team_affiliations']['Row']
export type TeamAffiliationInsert = Database['public']['Tables']['team_affiliations']['Insert']
export type TeamAffiliationUpdate = Database['public']['Tables']['team_affiliations']['Update']

export type CourseTeamListing = Database['public']['Tables']['course_team_listings']['Row']
export type CourseTeamListingInsert = Database['public']['Tables']['course_team_listings']['Insert']
export type CourseTeamListingUpdate = Database['public']['Tables']['course_team_listings']['Update']

export type TeamInviteLink = Database['public']['Tables']['team_invite_links']['Row']
export type TeamInviteLinkInsert = Database['public']['Tables']['team_invite_links']['Insert']
export type TeamInviteLinkUpdate = Database['public']['Tables']['team_invite_links']['Update']

// RPC payload shapes — kept narrow so the discriminated unions in callers
// stay exhaustive.
export type LookupTeamInviteLinkResult =
  Database['public']['Functions']['lookup_team_invite_link']['Returns'][number]
export type RedeemTeamInviteLinkResult =
  Database['public']['Functions']['redeem_team_invite_link']['Returns'][number]

// Notification preferences stored in sellers.settings JSONB.
// The 'messages' field is gone along with the messaging subsystem.
export interface NotificationSettings {
  newSignups: boolean
  cancellations: boolean
  marketing: boolean
}

export interface SellerSettings {
  notifications?: NotificationSettings
}
