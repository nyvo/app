/**
 * Auto-generated Supabase types + convenience aliases.
 *
 * Regenerate with: supabase gen types typescript --project-id nollnnkksgicsvuthnjq
 * Last generated: 2026-03-17
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types matching the database
export type CourseType = 'course-series' | 'event' | 'online'
export type CourseStatus = 'upcoming' | 'active' | 'completed' | 'cancelled'
export type SignupStatus = 'confirmed' | 'cancelled' | 'course_cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrgMemberRole = 'owner' | 'admin' | 'teacher'
export type CourseLevel = 'alle' | 'nybegynner' | 'viderekommen'
export type SessionStatus = 'upcoming' | 'completed' | 'cancelled'

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          email: string | null
          phone: string | null
          address: string | null
          city: string | null
          postal_code: string | null
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean | null
          settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          postal_code?: string | null
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean | null
          settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          phone: string | null
          is_platform_admin: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_platform_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_platform_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      org_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: OrgMemberRole
          created_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: OrgMemberRole
          created_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: OrgMemberRole
          created_at?: string | null
        }
      }
      courses: {
        Row: {
          id: string
          organization_id: string
          title: string
          description: string | null
          course_type: CourseType
          status: CourseStatus
          level: CourseLevel | null
          location: string | null
          time_schedule: string | null
          duration: number | null
          max_participants: number | null
          price: number | null
          allows_drop_in: boolean | null
          drop_in_price: number | null
          total_weeks: number | null
          start_date: string | null
          end_date: string | null
          instructor_id: string | null
          image_url: string | null
          idempotency_key: string | null
          practical_info: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          title: string
          description?: string | null
          course_type?: CourseType
          status?: CourseStatus
          level?: CourseLevel | null
          location?: string | null
          time_schedule?: string | null
          duration?: number | null
          max_participants?: number | null
          price?: number | null
          allows_drop_in?: boolean | null
          drop_in_price?: number | null
          total_weeks?: number | null
          start_date?: string | null
          end_date?: string | null
          instructor_id?: string | null
          image_url?: string | null
          idempotency_key?: string | null
          practical_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          title?: string
          description?: string | null
          course_type?: CourseType
          status?: CourseStatus
          level?: CourseLevel | null
          location?: string | null
          time_schedule?: string | null
          duration?: number | null
          max_participants?: number | null
          price?: number | null
          allows_drop_in?: boolean | null
          drop_in_price?: number | null
          total_weeks?: number | null
          start_date?: string | null
          end_date?: string | null
          instructor_id?: string | null
          image_url?: string | null
          idempotency_key?: string | null
          practical_info?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      signups: {
        Row: {
          id: string
          organization_id: string
          course_id: string
          user_id: string | null
          participant_name: string | null
          participant_email: string | null
          participant_phone: string | null
          status: SignupStatus
          is_drop_in: boolean | null
          class_date: string | null
          class_time: string | null
          note: string | null
          payment_status: PaymentStatus | null
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          stripe_receipt_url: string | null
          amount_paid: number | null
          refund_amount: number | null
          refunded_at: string | null
          signup_package_id: string | null
          package_weeks: number | null
          package_end_date: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          course_id: string
          user_id?: string | null
          participant_name?: string | null
          participant_email?: string | null
          participant_phone?: string | null
          status?: SignupStatus
          is_drop_in?: boolean | null
          class_date?: string | null
          class_time?: string | null
          note?: string | null
          payment_status?: PaymentStatus | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_receipt_url?: string | null
          amount_paid?: number | null
          refund_amount?: number | null
          refunded_at?: string | null
          signup_package_id?: string | null
          package_weeks?: number | null
          package_end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          course_id?: string
          user_id?: string | null
          participant_name?: string | null
          participant_email?: string | null
          participant_phone?: string | null
          status?: SignupStatus
          is_drop_in?: boolean | null
          class_date?: string | null
          class_time?: string | null
          note?: string | null
          payment_status?: PaymentStatus | null
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_receipt_url?: string | null
          amount_paid?: number | null
          refund_amount?: number | null
          refunded_at?: string | null
          signup_package_id?: string | null
          package_weeks?: number | null
          package_end_date?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          guest_email: string | null
          is_read: boolean | null
          archived: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          guest_email?: string | null
          is_read?: boolean | null
          archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          guest_email?: string | null
          is_read?: boolean | null
          archived?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          content: string
          is_outgoing: boolean
          is_read: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          conversation_id: string
          content: string
          is_outgoing?: boolean
          is_read?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          conversation_id?: string
          content?: string
          is_outgoing?: boolean
          is_read?: boolean | null
          created_at?: string | null
        }
      }
      course_sessions: {
        Row: {
          id: string
          course_id: string
          session_number: number
          session_date: string
          start_time: string
          end_time: string | null
          status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          session_number: number
          session_date: string
          start_time: string
          end_time?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          session_number?: number
          session_date?: string
          start_time?: string
          end_time?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      course_signup_packages: {
        Row: {
          id: string
          course_id: string
          label: string
          price: number
          weeks: number
          is_full_course: boolean | null
          sort_order: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          label: string
          price: number
          weeks: number
          is_full_course?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          label?: string
          price?: number
          weeks?: number
          is_full_course?: boolean | null
          sort_order?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
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
      }
    }
    Functions: {
      ensure_organization_for_user: {
        Args: { p_org_name: string; p_org_slug: string }
        Returns: {
          org_id: string
          org_slug: string
          org_name: string
          member_role: OrgMemberRole
          was_created: boolean
        }[]
      }
      create_signup_if_available: {
        Args: {
          p_course_id: string
          p_organization_id: string
          p_participant_name: string
          p_participant_email: string
          p_participant_phone: string
          p_stripe_checkout_session_id: string
          p_stripe_payment_intent_id: string
          p_stripe_receipt_url: string
          p_amount_paid: number
          p_is_drop_in?: boolean
          p_class_date?: string
          p_class_time?: string
          p_signup_package_id?: string
          p_package_weeks?: number
        }
        Returns: Json
      }
      create_course_idempotent: {
        Args: {
          p_organization_id: string
          p_idempotency_key: string
          p_title: string
          p_description?: string
          p_course_type?: string
          p_status?: string
          p_level?: string
          p_location?: string
          p_time_schedule?: string
          p_duration?: number
          p_max_participants?: number
          p_price?: number
          p_allows_drop_in?: boolean
          p_drop_in_price?: number
          p_total_weeks?: number
          p_start_date?: string
          p_end_date?: string
          p_instructor_id?: string
          p_image_url?: string
          p_style_id?: string
        }
        Returns: Json
      }
      check_session_conflict: {
        Args: {
          p_organization_id: string
          p_session_date: string
          p_start_time: string
          p_end_time: string
          p_exclude_course_id?: string
        }
        Returns: {
          has_conflict: boolean
          conflicting_course_id: string
          conflicting_course_title: string
          conflicting_start: string
          conflicting_end: string
        }[]
      }
      check_sessions_conflicts: {
        Args: {
          p_organization_id: string
          p_sessions: Json
          p_exclude_course_id?: string
        }
        Returns: {
          session_date: string
          has_conflict: boolean
          conflicting_course_id: string
          conflicting_course_title: string
          conflicting_start: string
          conflicting_end: string
        }[]
      }
      count_active_confirmed_signups: {
        Args: { p_course_id: string }
        Returns: number
      }
      calculate_package_end_date: {
        Args: { p_course_start_date: string; p_package_weeks: number }
        Returns: string
      }
      delete_course_cascade: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      link_guest_bookings: {
        Args: Record<string, never>
        Returns: number
      }
      cleanup_old_webhook_events: {
        Args: Record<string, never>
        Returns: number
      }
    }
    Enums: {
      course_type: CourseType
      course_status: CourseStatus
      signup_status: SignupStatus
      payment_status: PaymentStatus
      org_member_role: OrgMemberRole
      course_level: CourseLevel
    }
  }
}

// Helper types for easier usage
export type Organization = Database['public']['Tables']['organizations']['Row']
export type OrganizationInsert = Database['public']['Tables']['organizations']['Insert']
export type OrganizationUpdate = Database['public']['Tables']['organizations']['Update']

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export type OrgMember = Database['public']['Tables']['org_members']['Row']
export type OrgMemberInsert = Database['public']['Tables']['org_members']['Insert']
export type OrgMemberUpdate = Database['public']['Tables']['org_members']['Update']

export type Course = Database['public']['Tables']['courses']['Row']
export type CourseInsert = Database['public']['Tables']['courses']['Insert']
export type CourseUpdate = Database['public']['Tables']['courses']['Update']

export type Signup = Database['public']['Tables']['signups']['Row']
export type SignupInsert = Database['public']['Tables']['signups']['Insert']
export type SignupUpdate = Database['public']['Tables']['signups']['Update']

export type Conversation = Database['public']['Tables']['conversations']['Row']
export type ConversationInsert = Database['public']['Tables']['conversations']['Insert']
export type ConversationUpdate = Database['public']['Tables']['conversations']['Update']

export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
export type MessageUpdate = Database['public']['Tables']['messages']['Update']

export type CourseSession = Database['public']['Tables']['course_sessions']['Row']
export type CourseSessionInsert = Database['public']['Tables']['course_sessions']['Insert']
export type CourseSessionUpdate = Database['public']['Tables']['course_sessions']['Update']

export type CourseSignupPackage = Database['public']['Tables']['course_signup_packages']['Row']
export type CourseSignupPackageInsert = Database['public']['Tables']['course_signup_packages']['Insert']
export type CourseSignupPackageUpdate = Database['public']['Tables']['course_signup_packages']['Update']

// Notification preferences stored in organizations.settings JSONB
export interface NotificationSettings {
  newSignups: boolean
  cancellations: boolean
  messages: boolean
  marketing: boolean
}

export interface OrganizationSettings {
  notifications?: NotificationSettings
}
