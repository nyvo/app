export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enum types matching the database
export type CourseType = 'course-series' | 'event' | 'online'
export type CourseStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
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
          stripe_onboarding_complete: boolean
          fiken_company_slug: string | null
          settings: Json
          created_at: string
          updated_at: string
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
          stripe_onboarding_complete?: boolean
          fiken_company_slug?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
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
          stripe_onboarding_complete?: boolean
          fiken_company_slug?: string | null
          settings?: Json
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          name: string | null
          avatar_url: string | null
          phone: string | null
          is_platform_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_platform_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          phone?: string | null
          is_platform_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      org_members: {
        Row: {
          id: string
          organization_id: string
          user_id: string
          role: OrgMemberRole
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id: string
          role?: OrgMemberRole
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string
          role?: OrgMemberRole
          created_at?: string
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
          allows_drop_in: boolean
          drop_in_price: number | null
          total_weeks: number | null
          current_week: number
          start_date: string | null
          end_date: string | null
          instructor_id: string | null
          image_url: string | null
          idempotency_key: string | null
          practical_info: Json | null
          created_at: string
          updated_at: string
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
          allows_drop_in?: boolean
          drop_in_price?: number | null
          total_weeks?: number | null
          current_week?: number
          start_date?: string | null
          end_date?: string | null
          instructor_id?: string | null
          image_url?: string | null
          idempotency_key?: string | null
          practical_info?: Json | null
          created_at?: string
          updated_at?: string
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
          allows_drop_in?: boolean
          drop_in_price?: number | null
          total_weeks?: number | null
          current_week?: number
          start_date?: string | null
          end_date?: string | null
          instructor_id?: string | null
          image_url?: string | null
          idempotency_key?: string | null
          practical_info?: Json | null
          created_at?: string
          updated_at?: string
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
          is_drop_in: boolean
          class_date: string | null
          class_time: string | null
          note: string | null
          payment_status: PaymentStatus
          stripe_payment_intent_id: string | null
          stripe_checkout_session_id: string | null
          stripe_receipt_url: string | null
          amount_paid: number | null
          signup_package_id: string | null
          package_weeks: number | null
          package_end_date: string | null
          registered_at: string
          created_at: string
          updated_at: string
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
          is_drop_in?: boolean
          class_date?: string | null
          class_time?: string | null
          note?: string | null
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_receipt_url?: string | null
          amount_paid?: number | null
          signup_package_id?: string | null
          package_weeks?: number | null
          package_end_date?: string | null
          registered_at?: string
          created_at?: string
          updated_at?: string
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
          is_drop_in?: boolean
          class_date?: string | null
          class_time?: string | null
          note?: string | null
          payment_status?: PaymentStatus
          stripe_payment_intent_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_receipt_url?: string | null
          amount_paid?: number | null
          signup_package_id?: string | null
          package_weeks?: number | null
          package_end_date?: string | null
          registered_at?: string
          created_at?: string
          updated_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          guest_email: string | null
          is_read: boolean
          archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          guest_email?: string | null
          is_read?: boolean
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          guest_email?: string | null
          is_read?: boolean
          archived?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          content: string
          is_outgoing: boolean
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          content: string
          is_outgoing?: boolean
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          content?: string
          is_outgoing?: boolean
          is_read?: boolean
          created_at?: string
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
          status: SessionStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          session_number: number
          session_date: string
          start_time: string
          end_time?: string | null
          status?: SessionStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          session_number?: number
          session_date?: string
          start_time?: string
          end_time?: string | null
          status?: SessionStatus
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      create_organization_for_user: {
        Args: {
          org_name: string
          org_slug: string
          user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      course_type: CourseType
      course_status: CourseStatus
      signup_status: SignupStatus
      payment_status: PaymentStatus
      org_member_role: OrgMemberRole
      course_level: CourseLevel
      session_status: SessionStatus
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
