// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ValidateClaimTokenRequest {
  token: string
}

interface ClaimTokenResponse {
  valid: boolean
  expired?: boolean
  claimed?: boolean
  signup?: {
    id: string
    participant_name: string
    participant_email: string
    offer_expires_at: string
  }
  course?: {
    id: string
    title: string
    price: number
    start_date: string
    time_schedule: string
    location: string
  }
  organization?: {
    id: string
    name: string
    slug: string
  }
  error?: string
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const body: ValidateClaimTokenRequest = await req.json()

    if (!body.token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Missing token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Find signup with this claim token
    const { data: signup, error: signupError } = await supabase
      .from('signups')
      .select(`
        id,
        participant_name,
        participant_email,
        offer_status,
        offer_expires_at,
        offer_claim_token,
        course:courses(
          id,
          title,
          price,
          start_date,
          time_schedule,
          location,
          organization_id
        )
      `)
      .eq('offer_claim_token', body.token)
      .single()

    if (signupError || !signup) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid claim token' } as ClaimTokenResponse),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if already claimed
    if (signup.offer_status === 'claimed') {
      return new Response(
        JSON.stringify({ valid: false, claimed: true, error: 'Spot already claimed' } as ClaimTokenResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if expired
    const now = new Date()
    const expiresAt = signup.offer_expires_at ? new Date(signup.offer_expires_at) : null

    if (expiresAt && now > expiresAt) {
      return new Response(
        JSON.stringify({ valid: false, expired: true, error: 'Offer has expired' } as ClaimTokenResponse),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get organization details
    const course = signup.course as {
      id: string
      title: string
      price: number
      start_date: string
      time_schedule: string
      location: string
      organization_id: string
    } | null

    let organization = null
    if (course?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', course.organization_id)
        .single()
      organization = org
    }

    const response: ClaimTokenResponse = {
      valid: true,
      signup: {
        id: signup.id,
        participant_name: signup.participant_name || '',
        participant_email: signup.participant_email || '',
        offer_expires_at: signup.offer_expires_at || ''
      },
      course: course ? {
        id: course.id,
        title: course.title,
        price: course.price,
        start_date: course.start_date,
        time_schedule: course.time_schedule,
        location: course.location
      } : undefined,
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        slug: organization.slug
      } : undefined
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Validate claim token error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ valid: false, error: message } as ClaimTokenResponse),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
