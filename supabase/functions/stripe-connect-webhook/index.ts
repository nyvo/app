// Entry point only — the whole handler lives in handler.ts so tests can
// invoke it directly with a Request instead of standing up a server.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { handleStripeConnectWebhook } from './handler.ts'

Deno.serve(handleStripeConnectWebhook)
