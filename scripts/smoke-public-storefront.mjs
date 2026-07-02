import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const fileEnv = fs.existsSync('.env.local')
    ? Object.fromEntries(
        fs.readFileSync('.env.local', 'utf8')
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith('#'))
          .map((line) => {
            const index = line.indexOf('=')
            return [
              line.slice(0, index),
              line.slice(index + 1).replace(/^['"]|['"]$/g, ''),
            ]
          }),
      )
    : {}

  return {
    VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? fileEnv.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ?? fileEnv.VITE_SUPABASE_ANON_KEY,
  }
}

const env = loadEnv()
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const slug = process.argv[2] || 'kristoffer-studio'
const todayStr = new Date().toISOString().split('T')[0]
const grace = new Date()
grace.setDate(grace.getDate() - 30)
const graceStr = grace.toISOString().split('T')[0]

async function step(name, fn) {
  try {
    const result = await fn()
    if (result.error) {
      console.log(`FAIL ${name}: ${result.error.code || ''} ${result.error.message}`)
      process.exitCode = 1
      return result
    }
    const count = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0
    console.log(`OK   ${name}: ${count}`)
    return result
  } catch (error) {
    console.log(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
    return { data: null, error }
  }
}

const sellerRes = await step('seller by slug', () => supabase
  .from('sellers')
  .select('id, name, logo_url, slug, cover_image_url, default_course_image_url, stripe_onboarding_complete')
  .eq('slug', slug)
  .maybeSingle())

if (!sellerRes.data) process.exit()

await step('seller_slug_aliases select grant', () => supabase
  .from('seller_slug_aliases')
  .select('seller_id')
  .eq('old_slug', slug)
  .maybeSingle())

const scopeRes = await step('public_storefront_scope rpc', () => supabase
  .rpc('public_storefront_scope', { p_slug: slug }))

const sellerIds = Array.from(new Set((scopeRes.data || []).map((row) => row.seller_id)))
if (sellerIds.length === 0) process.exit()

const coursesRes = await step('public courses list query', () => supabase
  .from('courses')
  .select(`
    id,
    slug,
    title,
    description,
    format,
    delivery_mode,
    status,
    location,
    time_schedule,
    duration,
    max_participants,
    price,
    total_weeks,
    start_date,
    end_date,
    image_url,
    instructor_name,
    seller_id,
    seller:sellers(id, name, logo_url, slug, default_course_image_url, stripe_onboarding_complete)
  `)
  .in('status', ['active', 'upcoming', 'cancelled'])
  .order('start_date', { ascending: true })
  .in('seller_id', sellerIds)
  .or(
    `end_date.gte.${todayStr},` +
    `and(end_date.is.null,start_date.gte.${todayStr}),` +
    `and(end_date.is.null,start_date.is.null),` +
    `and(status.eq.cancelled,start_date.gte.${graceStr})`,
  )
  .range(0, 19))

const courseIds = (coursesRes.data || []).map((course) => course.id)
if (courseIds.length === 0) process.exit()

await step('public signup counts rpc', () => supabase
  .rpc('public_signup_counts', { p_course_ids: courseIds }))

await step('course_sessions public fields', () => supabase
  .from('course_sessions')
  .select('course_id, session_date, session_number, status')
  .in('course_id', courseIds)
  .order('session_date', { ascending: true }))

await step('course_signup_packages public fields', () => supabase
  .from('course_signup_packages')
  .select('course_id, price')
  .in('course_id', courseIds)
  .eq('ticket_kind', 'drop_in')
  .eq('is_active', true))
