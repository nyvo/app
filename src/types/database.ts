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
export type CourseStatus = 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled'
export type SignupStatus = 'confirmed' | 'cancelled' | 'course_cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'
export type OrgMemberRole = 'owner' | 'admin' | 'teacher'
export type CourseLevel = 'alle' | 'nybegynner' | 'viderekommen'
export type SessionStatus = 'upcoming' | 'completed' | 'cancelled'
export type ExceptionType = 'payment_failed' | 'pending_payment'
// NotificationType + NotificationStatus removed 2026-04-25 along with the
// notifications table — the in-app alert dropdown was retired in favor of
// the dashboard activity card. Email-notification preferences (newSignups,
// cancellations, etc.) are unrelated and live on `OrganizationSettings`.
export type SpaceMemberRole = 'tenant' | 'admin'
export type SpaceJoinRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'
// Ticket-type model — every priced unit (course, package, drop-in) is a row in
// course_signup_packages, distinguished by ticket_kind. audience describes who
// the ticket is for; pricing math lives in the row's price column, not here.
export type TicketKind = 'package' | 'drop_in' | 'pass'
export type TicketAudience = 'standard' | 'student' | 'senior' | 'staff'

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
  organizationId?: string;
  exceptionType?: ExceptionType | null;
  courseEnded?: boolean;
  courseEndDate?: string | null;
  courseCapacity?: number | null;
}

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
          dintero_seller_id: string | null
          dintero_approval_id: string | null
          dintero_contract_url: string | null
          dintero_onboarding_status: string | null
          dintero_onboarding_complete: boolean | null
          studio_shared_at: string | null
          settings: Json | null
          default_course_image_url: string | null
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
          dintero_seller_id?: string | null
          dintero_approval_id?: string | null
          dintero_contract_url?: string | null
          dintero_onboarding_status?: string | null
          dintero_onboarding_complete?: boolean | null
          studio_shared_at?: string | null
          settings?: Json | null
          default_course_image_url?: string | null
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
          dintero_seller_id?: string | null
          dintero_approval_id?: string | null
          dintero_contract_url?: string | null
          dintero_onboarding_status?: string | null
          dintero_onboarding_complete?: boolean | null
          studio_shared_at?: string | null
          settings?: Json | null
          default_course_image_url?: string | null
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
          bio: string | null
          phone: string | null
          is_platform_admin: boolean | null
          onboarding_completed_at: string | null
          setup_complete_seen_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          name?: string | null
          avatar_url?: string | null
          bio?: string | null
          phone?: string | null
          is_platform_admin?: boolean | null
          onboarding_completed_at?: string | null
          setup_complete_seen_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          name?: string | null
          avatar_url?: string | null
          bio?: string | null
          phone?: string | null
          is_platform_admin?: boolean | null
          onboarding_completed_at?: string | null
          setup_complete_seen_at?: string | null
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
        // Post-20260426030000: allows_drop_in + drop_in_price dropped. Drop-in
        // availability + price now lives in course_signup_packages rows with
        // ticket_kind = 'drop_in'.
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
      course_instructors: {
        Row: {
          course_id: string
          profile_id: string
          role: 'primary' | 'guest'
          display_order: number
          created_at: string
        }
        Insert: {
          course_id: string
          profile_id: string
          role?: 'primary' | 'guest'
          display_order?: number
          created_at?: string
        }
        Update: {
          course_id?: string
          profile_id?: string
          role?: 'primary' | 'guest'
          display_order?: number
          created_at?: string
        }
      }
      signups: {
        // Post-20260426030000 schema. is_drop_in / class_date / class_time
        // were dropped — derive drop-in via ticket_kind_snapshot === 'drop_in'
        // and read date/time from the joined course_sessions row via
        // course_session_id. signup_package_id was dropped — use ticket_type_id.
        // package_weeks was dropped — derive from the linked tier or rely on
        // the ticket_label_snapshot for display.
        Row: {
          id: string
          organization_id: string
          course_id: string
          user_id: string | null
          participant_name: string | null
          participant_email: string | null
          participant_phone: string | null
          status: SignupStatus
          note: string | null
          payment_status: PaymentStatus | null
          dintero_transaction_id: string | null
          dintero_session_id: string | null
          dintero_merchant_reference: string | null
          amount_paid: number | null
          refund_amount: number | null
          refunded_at: string | null
          // Ticket-type model — NOT NULL on every row post-migration.
          ticket_type_id: string
          ticket_label_snapshot: string
          ticket_audience_snapshot: TicketAudience
          ticket_kind_snapshot: TicketKind
          // Set only when ticket_kind_snapshot = 'drop_in'. Points to the
          // specific session the buyer purchased.
          course_session_id: string | null
          // Set only when ticket_kind_snapshot != 'drop_in'. Last date covered
          // by the package window (start_date + (weeks-1)*7 days).
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
          note?: string | null
          payment_status?: PaymentStatus | null
          dintero_transaction_id?: string | null
          dintero_session_id?: string | null
          dintero_merchant_reference?: string | null
          amount_paid?: number | null
          refund_amount?: number | null
          refunded_at?: string | null
          ticket_type_id: string
          ticket_label_snapshot: string
          ticket_audience_snapshot: TicketAudience
          ticket_kind_snapshot: TicketKind
          course_session_id?: string | null
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
          note?: string | null
          payment_status?: PaymentStatus | null
          dintero_transaction_id?: string | null
          dintero_session_id?: string | null
          dintero_merchant_reference?: string | null
          amount_paid?: number | null
          refund_amount?: number | null
          refunded_at?: string | null
          ticket_type_id?: string
          ticket_label_snapshot?: string
          ticket_audience_snapshot?: TicketAudience
          ticket_kind_snapshot?: TicketKind
          course_session_id?: string | null
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
        // Despite the table name, this is the unified ticket-types model.
        // Every priced unit (full course, multi-week package, drop-in for one
        // session) is a row, distinguished by ticket_kind. See migration
        // 20260426020000_ticket_types.sql for the rationale.
        Row: {
          id: string
          course_id: string
          label: string
          description: string | null
          price: number
          // weeks is NULL for ticket_kind='drop_in', NOT NULL for 'package'.
          weeks: number | null
          ticket_kind: TicketKind
          audience: TicketAudience
          is_full_course: boolean | null
          is_active: boolean
          is_default: boolean
          display_order: number
          // Sales window — used for early-bird (sales_ends_at set) and pre-sale
          // (sales_starts_at set). Both NULL = always buyable while is_active.
          sales_starts_at: string | null
          sales_ends_at: string | null
          // Course-wide cap on this ticket type (sums across all sessions).
          // NULL = unlimited. Not per-session — that's max_participants.
          max_quantity: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          label: string
          description?: string | null
          price: number
          weeks?: number | null
          ticket_kind?: TicketKind
          audience?: TicketAudience
          is_full_course?: boolean | null
          is_active?: boolean
          is_default?: boolean
          display_order?: number
          sales_starts_at?: string | null
          sales_ends_at?: string | null
          max_quantity?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          label?: string
          description?: string | null
          price?: number
          weeks?: number | null
          ticket_kind?: TicketKind
          audience?: TicketAudience
          is_full_course?: boolean | null
          is_active?: boolean
          is_default?: boolean
          display_order?: number
          sales_starts_at?: string | null
          sales_ends_at?: string | null
          max_quantity?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      teacher_locations: {
        Row: {
          id: string
          organization_id: string
          name: string
          rooms: string[]
          address: string | null
          is_favorite: boolean
          latitude: number | null
          longitude: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          rooms?: string[]
          address?: string | null
          is_favorite?: boolean
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          rooms?: string[]
          address?: string | null
          is_favorite?: boolean
          latitude?: number | null
          longitude?: number | null
          created_at?: string
          updated_at?: string
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
      // Pre-payment context buffer — every Dintero session creation writes one
      // row here with full booking context, keyed by id (which becomes the
      // merchant_reference on the Dintero session). Lets the webhook + finalizer
      // recover state without round-tripping data through Dintero. Added in
      // the 20260422010000 Stripe→Dintero migration; ticket-type snapshot
      // columns added in 20260426020000.
      // Pre-payment context buffer. Post-20260426030000: legacy is_drop_in /
      // class_date / class_time / signup_package_id / package_weeks dropped.
      // course_session_id (added in the Stripe→Dintero migration) carries the
      // session reference for drop-ins; ticket_type_id + snapshots carry tier
      // context. ticket_type_id is nullable for orphaned legacy attempt rows
      // from before the cleanup; new attempts MUST set it.
      payment_attempts: {
        Row: {
          id: string
          course_id: string
          organization_id: string
          participant_name: string
          participant_email: string
          participant_phone: string | null
          course_session_id: string | null
          base_price_nok: number
          service_fee_nok: number
          total_price_nok: number
          status: 'pending' | 'authorized' | 'captured' | 'failed' | 'voided' | 'refunded'
          dintero_session_id: string | null
          dintero_transaction_id: string | null
          ticket_type_id: string | null
          ticket_label_snapshot: string | null
          ticket_audience_snapshot: TicketAudience | null
          ticket_kind_snapshot: TicketKind | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          course_id: string
          organization_id: string
          participant_name: string
          participant_email: string
          participant_phone?: string | null
          course_session_id?: string | null
          base_price_nok: number
          service_fee_nok: number
          total_price_nok: number
          status?: 'pending' | 'authorized' | 'captured' | 'failed' | 'voided' | 'refunded'
          dintero_session_id?: string | null
          dintero_transaction_id?: string | null
          ticket_type_id?: string | null
          ticket_label_snapshot?: string | null
          ticket_audience_snapshot?: TicketAudience | null
          ticket_kind_snapshot?: TicketKind | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          course_id?: string
          organization_id?: string
          participant_name?: string
          participant_email?: string
          participant_phone?: string | null
          course_session_id?: string | null
          base_price_nok?: number
          service_fee_nok?: number
          total_price_nok?: number
          status?: 'pending' | 'authorized' | 'captured' | 'failed' | 'voided' | 'refunded'
          dintero_session_id?: string | null
          dintero_transaction_id?: string | null
          ticket_type_id?: string | null
          ticket_label_snapshot?: string | null
          ticket_audience_snapshot?: TicketAudience | null
          ticket_kind_snapshot?: TicketKind | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      // notifications + notification_reads tables removed 2026-04-25
      // (in-app alert dropdown system retired in favor of dashboard activity card).
      spaces: {
        Row: {
          id: string
          slug: string
          name: string
          description: string | null
          address: string | null
          city: string | null
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          name: string
          description?: string | null
          address?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          name?: string
          description?: string | null
          address?: string | null
          city?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      space_members: {
        Row: {
          space_id: string
          organization_id: string
          role: SpaceMemberRole
          joined_at: string
          visible: boolean
        }
        Insert: {
          space_id: string
          organization_id: string
          role?: SpaceMemberRole
          joined_at?: string
          visible?: boolean
        }
        Update: {
          space_id?: string
          organization_id?: string
          role?: SpaceMemberRole
          joined_at?: string
          visible?: boolean
        }
      }
      space_join_requests: {
        Row: {
          id: string
          space_id: string
          organization_id: string
          requested_by_user_id: string | null
          status: SpaceJoinRequestStatus
          message: string | null
          decided_by_user_id: string | null
          decided_at: string | null
          decision_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          space_id: string
          organization_id: string
          requested_by_user_id?: string | null
          status?: SpaceJoinRequestStatus
          message?: string | null
          decided_by_user_id?: string | null
          decided_at?: string | null
          decision_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          space_id?: string
          organization_id?: string
          requested_by_user_id?: string | null
          status?: SpaceJoinRequestStatus
          message?: string | null
          decided_by_user_id?: string | null
          decided_at?: string | null
          decision_note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      get_signup_by_dintero_id: {
        Args: {
          p_transaction_id?: string | null
          p_merchant_reference?: string | null
        }
        Returns: Json
      }
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
      // Atomic ticket-type-aware signup creation. Validates sales window +
      // capacity (per-session for drop-in, multi-session for packages) +
      // tier quota inside an advisory-locked transaction. Writes the three
      // write-once snapshots so receipts and reporting survive future tier
      // edits.
      create_signup_if_available: {
        Args: {
          p_organization_id: string
          p_course_id: string
          p_ticket_type_id: string
          p_participant_name: string
          p_participant_email: string
          p_participant_phone: string
          p_amount_paid: number
          p_dintero_transaction_id: string
          p_dintero_session_id: string
          p_dintero_merchant_reference: string
          p_course_session_id?: string
          p_user_id?: string
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
      // count_active_confirmed_signups (course-wide) was dropped in
      // 20260426030000. Use count_signups_for_session(session_id) instead —
      // capacity is per-session in the ticket-type model.
      calculate_package_end_date: {
        Args: { p_course_start_date: string; p_package_weeks: number }
        Returns: string
      }
      delete_course_cascade: {
        Args: { p_course_id: string }
        Returns: undefined
      }
      cleanup_old_webhook_events: {
        Args: Record<string, never>
        Returns: number
      }
      // get_active_notifications RPC removed 2026-04-25 with the notifications table.
      // Public RPC. Returns ticket types currently buyable for a course, with
      // seats_remaining computed (NULL when max_quantity is NULL = unlimited).
      // Centralises the "is this buyable right now" rule so the booking page
      // and the create-dintero-session edge function agree.
      available_ticket_types: {
        Args: { p_course_id: string }
        Returns: {
          id: string
          course_id: string
          label: string
          description: string | null
          price: number
          weeks: number | null
          ticket_kind: TicketKind
          audience: TicketAudience
          is_default: boolean
          display_order: number
          sales_starts_at: string | null
          sales_ends_at: string | null
          max_quantity: number | null
          seats_remaining: number | null
        }[]
      }
      // Per-session capacity primitive. Counts confirmed attendees on a
      // session: drop-in buyers linked via course_session_id + package buyers
      // whose window covers the session date.
      count_signups_for_session: {
        Args: { p_course_session_id: string }
        Returns: number
      }
      // Course-wide count for a single ticket type. Used to enforce
      // max_quantity (tier quota). Not per-session.
      count_signups_by_ticket_type: {
        Args: { p_course_id: string; p_ticket_type_id: string }
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
      ticket_kind_t: TicketKind
      ticket_audience_t: TicketAudience
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

export type CourseInstructor = Database['public']['Tables']['course_instructors']['Row']
export type CourseInstructorInsert = Database['public']['Tables']['course_instructors']['Insert']
export type CourseInstructorUpdate = Database['public']['Tables']['course_instructors']['Update']
export type CourseInstructorRole = CourseInstructor['role']

export type CourseSignupPackage = Database['public']['Tables']['course_signup_packages']['Row']
export type CourseSignupPackageInsert = Database['public']['Tables']['course_signup_packages']['Insert']
export type CourseSignupPackageUpdate = Database['public']['Tables']['course_signup_packages']['Update']

// Domain alias — the table is "course_signup_packages" but the conceptual
// model is ticket types. Prefer TicketType in new code; both resolve to the
// same row shape.
export type TicketType = CourseSignupPackage
export type TicketTypeInsert = CourseSignupPackageInsert
export type TicketTypeUpdate = CourseSignupPackageUpdate
// What `available_ticket_types(course_id)` returns — adds seats_remaining,
// excludes the audit columns (created_at/updated_at) we don't need on the
// public booking page.
export type AvailableTicketType =
  Database['public']['Functions']['available_ticket_types']['Returns'][number]

export type PaymentAttempt = Database['public']['Tables']['payment_attempts']['Row']
export type PaymentAttemptInsert = Database['public']['Tables']['payment_attempts']['Insert']
export type PaymentAttemptUpdate = Database['public']['Tables']['payment_attempts']['Update']

export type TeacherLocation = Database['public']['Tables']['teacher_locations']['Row']
export type TeacherLocationInsert = Database['public']['Tables']['teacher_locations']['Insert']
export type TeacherLocationUpdate = Database['public']['Tables']['teacher_locations']['Update']

export type Space = Database['public']['Tables']['spaces']['Row']
export type SpaceInsert = Database['public']['Tables']['spaces']['Insert']
export type SpaceUpdate = Database['public']['Tables']['spaces']['Update']

export type SpaceMember = Database['public']['Tables']['space_members']['Row']
export type SpaceMemberInsert = Database['public']['Tables']['space_members']['Insert']
export type SpaceMemberUpdate = Database['public']['Tables']['space_members']['Update']

export type SpaceJoinRequest = Database['public']['Tables']['space_join_requests']['Row']
export type SpaceJoinRequestInsert = Database['public']['Tables']['space_join_requests']['Insert']
export type SpaceJoinRequestUpdate = Database['public']['Tables']['space_join_requests']['Update']

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
