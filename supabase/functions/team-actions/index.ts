import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

Deno.serve((_req: Request) => {
  return new Response(
    JSON.stringify({
      error: 'gone',
      message: 'This function has been retired. Use team_invite_links and team_affiliations.',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    },
  )
})
