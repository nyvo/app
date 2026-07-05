// Google Places (New) proxy. Keeps GOOGLE_PLACES_API_KEY server-side so it
// never reaches the browser bundle. Two actions share one session token
// (client-generated) so autocomplete keystrokes + the terminating details
// lookup bill as a single Places session.
//
// Auth: this function is NOT listed in config.toml, so verify_jwt defaults to
// true — only authenticated teachers (whose JWT supabase-js attaches to
// functions.invoke) can reach it. That, plus a per-IP rate limit, bounds abuse
// of our Google quota.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { handleCors, errorResponse, successResponse, getClientIp } from '../_shared/auth.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const googleApiKey = Deno.env.get('GOOGLE_PLACES_API_KEY') || ''

const PLACES_BASE = 'https://places.googleapis.com/v1'

interface AutocompleteBody { action: 'autocomplete'; input: string; sessionToken: string }
interface DetailsBody { action: 'details'; placeId: string; sessionToken: string }
type PlacesBody = AutocompleteBody | DetailsBody

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (!googleApiKey) {
    console.error('google-places: GOOGLE_PLACES_API_KEY is not set')
    return errorResponse('Stedssøk er ikke konfigurert.', 500, req)
  }

  try {
    const body = (await req.json()) as PlacesBody
    if (!body?.action || !body.sessionToken) {
      return errorResponse('Missing action or sessionToken', 400, req)
    }

    // Per-IP fixed-window limit. Autocomplete fires per keystroke, so the bucket
    // is generous; fail open (only block on an explicit false) so a limiter
    // hiccup never wedges a teacher mid-search. Kick the check off now but don't
    // await it yet — run it concurrently with the Google call below so the DB
    // round-trip doesn't add latency to every keystroke.
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const clientIp = getClientIp(req)
    const limitPromise = supabase.rpc('check_rate_limit', {
      p_key: `places:ip:${clientIp}`,
      p_limit: 200,
      p_window_seconds: 3600,
    })
    const isRateLimited = async () => {
      const { data: allowed, error: limitErr } = await limitPromise
      if (limitErr) console.error('check_rate_limit failed:', limitErr)
      return allowed === false
    }

    if (body.action === 'autocomplete') {
      const input = (body.input || '').trim()
      if (input.length < 3) return successResponse({ suggestions: [] }, 200, req)

      const [limited, res] = await Promise.all([
        isRateLimited(),
        fetch(`${PLACES_BASE}/places:autocomplete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': googleApiKey,
          },
          body: JSON.stringify({
            input,
            sessionToken: body.sessionToken,
            languageCode: 'no',
            regionCode: 'NO',
            includedRegionCodes: ['no'],
          }),
        }),
      ])
      if (limited) return errorResponse('For mange søk. Prøv igjen om litt.', 429, req)
      if (!res.ok) {
        console.error('places:autocomplete', res.status, await res.text())
        return errorResponse('Søket feilet. Prøv igjen.', 502, req)
      }
      const json = (await res.json()) as {
        suggestions?: Array<{
          placePrediction?: {
            placeId: string
            text?: { text?: string }
            structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
          }
        }>
      }
      const suggestions = (json.suggestions ?? [])
        .map((s) => s.placePrediction)
        .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
        .map((p) => ({
          placeId: p.placeId,
          primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary: p.structuredFormat?.secondaryText?.text ?? '',
        }))
      return successResponse({ suggestions }, 200, req)
    }

    if (body.action === 'details') {
      if (!body.placeId) return errorResponse('Missing placeId', 400, req)
      if (await isRateLimited()) {
        return errorResponse('For mange søk. Prøv igjen om litt.', 429, req)
      }

      const url = new URL(`${PLACES_BASE}/places/${encodeURIComponent(body.placeId)}`)
      url.searchParams.set('sessionToken', body.sessionToken)
      url.searchParams.set('languageCode', 'no')
      url.searchParams.set('regionCode', 'NO')

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'X-Goog-Api-Key': googleApiKey,
          // Field mask kept minimal — only what we store/show. Keeps the
          // details call in the cheapest Essentials tier.
          'X-Goog-FieldMask': 'id,displayName,formattedAddress,location',
        },
      })
      if (!res.ok) {
        console.error('places:details', res.status, await res.text())
        return errorResponse('Kunne ikke hente stedet. Prøv igjen.', 502, req)
      }
      const json = (await res.json()) as {
        id?: string
        displayName?: { text?: string }
        formattedAddress?: string
        location?: { latitude?: number; longitude?: number }
      }
      return successResponse({
        placeId: json.id ?? body.placeId,
        name: json.displayName?.text ?? '',
        address: json.formattedAddress ?? '',
        lat: json.location?.latitude ?? null,
        lon: json.location?.longitude ?? null,
      }, 200, req)
    }

    return errorResponse('Unknown action', 400, req)
  } catch (err) {
    console.error('google-places error:', err)
    return errorResponse('Noe gikk galt. Prøv igjen.', 500, req)
  }
})
