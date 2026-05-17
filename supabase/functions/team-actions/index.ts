// Team actions — single edge function for the two privileged multi-step
// mutations in the simplified Teams feature:
//
//   action='create' — caller's owner/admin seller becomes the new team's admin.
//     Service-role inserts the team row + the first team_members row in
//     sequence (with rollback if the second insert fails). Returns the new
//     team + invite_code.
//
//   action='join-with-code' — caller's owner/admin seller joins an existing
//     team as 'tenant' via the invite_code. Verifies the caller is owner/
//     admin of the requesting seller, looks up team by code (case-insensitive),
//     inserts team_members(role='tenant'). Idempotent on (team_id, seller_id).
//
// Why an edge function (not RLS):
//   - 'create' must atomically write 2 rows (team + first admin member).
//     Without service-role, the new team exists for a moment with no admin,
//     racing any RLS policy that gates on is_team_admin.
//   - 'join-with-code' needs to look up a team by a private code that the
//     caller doesn't have read access to until they're a member. Service-role
//     does the lookup, then writes the membership.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import {
  verifyAuth,
  handleCors,
  errorResponse,
  successResponse,
} from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Slug rules: lowercase alphanumeric + dashes, 3-40 chars, no leading/trailing
// or repeated dashes. Mirrors `validateSlug` in src/lib/reservedSlugs.ts.
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9]|-(?!-))*[a-z0-9]$/

// Reserved slugs — see src/lib/reservedSlugs.ts (kept in sync manually).
// These collide with top-level routes in the flat-slug URL scheme.
const RESERVED_SLUGS = new Set<string>([
  'signup','login','logout','forgot-password','reset-password','terms','checkout',
  'confirm-email','teacher','dev','studio','studios','space','spaces','team','teams',
  'admin','api','auth','account','accounts','signin','sign-in','sign-up','register',
  'verify','oauth','about','pricing','price','contact','help','support','blog','news',
  'docs','documentation','faq','careers','jobs','press','privacy','legal','cookies',
  'security','features','product','platform','enterprise','business','home','welcome',
  'onboarding','dashboard','app','apps','settings','profile','profiles','preferences',
  'billing','invoice','invoices','payment','payments','payouts','refund','refunds',
  'invite','invites','om-oss','priser','kontakt','hjelp','personvern','vilkar','vilkaar',
  'kurs','course','courses','event','events','schedule','timeplan','booking','book',
  'paamelding','pamelding','cancel','avbestill','static','assets','public','private',
  'favicon','robots','sitemap','manifest','icon','icons','og','embed','oembed','rss',
  'feed','json','null','undefined','true','false','new','_','@','$','__internal','__data',
])

// Invite-code rules: uppercase alphanumeric + optional dashes, 4-16 chars.
// We generate codes in `XXX-XXX` format but accept user-typed codes that may
// have stray spaces or lowercase — we normalize before lookup.
const CODE_NORMALIZE_REGEX = /[^A-Z0-9-]/g

interface CreateRequest {
  action: 'create'
  seller_id: string
  name: string
  slug: string
  city?: string | null
  description?: string | null
  cover_image_url?: string | null
}

interface JoinRequest {
  action: 'join-with-code'
  seller_id: string
  code: string
}

type Body = CreateRequest | JoinRequest

// ============================================================================
// Invite-code generator
//
// 7-char alphanumeric, dash after position 3: "X4P-7K9". Crypto-random; we
// retry on the (vanishingly unlikely) collision against the unique index.
// ============================================================================
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // ambiguous chars dropped: I, O, 0, 1
function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  return `${chars.slice(0, 3).join('')}-${chars.slice(3, 6).join('')}`
}

// ============================================================================
// Seller membership check — only seller owner/admin can create or join on behalf
// of the seller. Mirrors the RLS rule on team_members updates/inserts.
// ============================================================================
async function verifySellerOwnerOrAdmin(
  client: ReturnType<typeof createClient>,
  userId: string,
  sellerId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const { data, error } = await client
    .from('seller_members')
    .select('role')
    .eq('seller_id', sellerId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { ok: false, status: 500, message: 'Permission lookup failed' }
  }
  if (!data) {
    return { ok: false, status: 403, message: 'Not a member of that seller' }
  }
  const role = (data as { role: string }).role
  if (role !== 'owner' && role !== 'admin') {
    return { ok: false, status: 403, message: 'Requires owner or admin role on the seller' }
  }
  return { ok: true }
}

// ============================================================================
// Action: create
// ============================================================================
async function createTeam(req: Request, userId: string, body: CreateRequest): Promise<Response> {
  // Validate input
  if (!UUID_REGEX.test(body.seller_id)) {
    return errorResponse('Invalid seller_id', 400, req)
  }
  const name = (body.name ?? '').trim()
  if (name.length === 0 || name.length > 120) {
    return errorResponse('Name must be 1–120 characters', 400, req)
  }
  const slug = (body.slug ?? '').trim().toLowerCase()
  if (slug.length < 3 || slug.length > 40 || !SLUG_REGEX.test(slug)) {
    return errorResponse('Slug must be 3–40 characters: lowercase letters, digits, single dashes', 400, req)
  }
  if (RESERVED_SLUGS.has(slug)) {
    return errorResponse('Denne lenken er reservert. Velg en annen.', 400, req)
  }
  const city = body.city?.trim().slice(0, 120) || null
  const description = body.description?.trim().slice(0, 500) || null
  const coverImageUrl = body.cover_image_url?.trim() || null

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Authorization
  const auth = await verifySellerOwnerOrAdmin(supabase, userId, body.seller_id)
  if (!auth.ok) return errorResponse(auth.message, auth.status, req)

  // Slug pre-check (UNIQUE index will catch race, but a friendly error is
  // better than a Postgres 23505 in the UI).
  const { data: existing } = await supabase
    .from('teams')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    return errorResponse('Slug is already taken', 409, req)
  }

  // Try to insert team, retrying once on invite_code collision.
  let teamRow: { id: string; slug: string; name: string; invite_code: string } | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode()
    const { data, error } = await supabase
      .from('teams')
      .insert({
        slug,
        name,
        city,
        description,
        cover_image_url: coverImageUrl,
        invite_code: code,
        owner_seller_id: body.seller_id,
      })
      .select('id, slug, name, invite_code')
      .single()

    if (!error) {
      teamRow = data as typeof teamRow
      break
    }

    const code23505 = (error as { code?: string }).code === '23505'
    if (code23505 && attempt < 2) continue // collision on invite_code; try a fresh code
    if (code23505) {
      return errorResponse('Slug is already taken', 409, req)
    }
    console.error('Insert team failed:', error)
    return errorResponse('Failed to create team', 500, req)
  }

  if (!teamRow) {
    return errorResponse('Could not generate a unique invite code', 500, req)
  }

  // Insert first admin member. If this fails we delete the team to keep
  // the DB in a coherent state (a team with no admin is unrecoverable).
  const { error: memberErr } = await supabase
    .from('team_members')
    .insert({
      team_id: teamRow.id,
      seller_id: body.seller_id,
      role: 'admin',
      visible: true,
    })

  if (memberErr) {
    console.error('Insert first admin member failed:', memberErr)
    await supabase.from('teams').delete().eq('id', teamRow.id)
    return errorResponse('Failed to set up admin membership', 500, req)
  }

  return successResponse(
    {
      team: teamRow,
      seller_id: body.seller_id,
    },
    201,
    req,
  )
}

// ============================================================================
// Action: join-with-code
// ============================================================================
async function joinTeam(req: Request, userId: string, body: JoinRequest): Promise<Response> {
  if (!UUID_REGEX.test(body.seller_id)) {
    return errorResponse('Invalid seller_id', 400, req)
  }

  const normalizedCode = (body.code ?? '').toUpperCase().replace(CODE_NORMALIZE_REGEX, '')
  if (normalizedCode.length < 4 || normalizedCode.length > 16) {
    return errorResponse('Invalid invite code', 400, req)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Authorization
  const auth = await verifySellerOwnerOrAdmin(supabase, userId, body.seller_id)
  if (!auth.ok) return errorResponse(auth.message, auth.status, req)

  // Look up team by code (case + dash variations are normalized in `code`).
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, slug, name, invite_code')
    .eq('invite_code', normalizedCode)
    .maybeSingle()

  if (teamErr) {
    console.error('Team lookup failed:', teamErr)
    return errorResponse('Lookup failed', 500, req)
  }
  if (!team) {
    return errorResponse('Fant ikke koden.', 404, req)
  }

  // Idempotent insert. If the seller is already a member (admin OR tenant) the
  // PK constraint catches it; surface as success with the existing team.
  const { error: insertErr } = await supabase
    .from('team_members')
    .insert({
      team_id: (team as { id: string }).id,
      seller_id: body.seller_id,
      role: 'tenant',
      visible: true,
    })

  if (insertErr) {
    const code23505 = (insertErr as { code?: string }).code === '23505'
    if (!code23505) {
      console.error('Insert team_members failed:', insertErr)
      return errorResponse('Failed to join team', 500, req)
    }
    // Already a member — return success with the existing team.
  }

  const { id, slug, name } = team as { id: string; slug: string; name: string }
  return successResponse(
    {
      team: { id, slug, name },
      seller_id: body.seller_id,
      already_member: Boolean(insertErr),
    },
    200,
    req,
  )
}

// ============================================================================
// Entry point
// ============================================================================
Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await verifyAuth(req)
    if (!authResult.authenticated || !authResult.userId) {
      return errorResponse(authResult.error || 'Unauthorized', 401, req)
    }

    const body = (await req.json()) as Body | { action?: string }
    if (!body || typeof body !== 'object' || !('action' in body)) {
      return errorResponse('Missing action', 400, req)
    }

    switch (body.action) {
      case 'create':
        return await createTeam(req, authResult.userId, body as CreateRequest)
      case 'join-with-code':
        return await joinTeam(req, authResult.userId, body as JoinRequest)
      default:
        return errorResponse(`Unknown action: ${(body as { action: string }).action}`, 400, req)
    }
  } catch (err) {
    console.error('team-actions error:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return errorResponse(message, 500, req)
  }
})
