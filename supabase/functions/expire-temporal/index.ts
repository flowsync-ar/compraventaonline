// Supabase Edge Function — expire-temporal
// Deno runtime. Do NOT use node_modules.
//
// Marks as inactive:
//   highlighted_products where end_date < now() AND active = true
//   seller_rewards where expires_at < now() AND claimed = false
//
// Scheduled via schedule.json (cron: every hour).
// Invoked by Supabase scheduler — no auth header needed from cron,
// but we validate the Authorization header when called manually.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  // Allow Supabase internal cron calls (no auth) and manual calls with service key
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (authHeader && authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''

  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // ── Expire highlighted_products ──────────────────────────────
  // Column: active (boolean), end_date (timestamptz)
  const { error: highlightError, count: highlightCount } = await admin
    .from('highlighted_products')
    .update({ active: false })
    .lt('end_date', new Date().toISOString())
    .eq('active', true)
    .select('id')

  if (highlightError) {
    console.error('[expire-temporal] highlighted_products update failed:', highlightError.message)
  }

  // ── Expire seller_rewards ────────────────────────────────────
  // Column: claimed (boolean), expires_at (timestamptz)
  const { error: rewardError, count: rewardCount } = await admin
    .from('seller_rewards')
    .update({ claimed: true })
    .lt('expires_at', new Date().toISOString())
    .eq('claimed', false)
    .not('expires_at', 'is', null)
    .select('id')

  if (rewardError) {
    console.error('[expire-temporal] seller_rewards update failed:', rewardError.message)
  }

  const result = {
    highlighted_expired: highlightCount ?? 0,
    rewards_expired: rewardCount ?? 0,
    errors: [
      ...(highlightError ? [`highlighted_products: ${highlightError.message}`] : []),
      ...(rewardError ? [`seller_rewards: ${rewardError.message}`] : []),
    ],
  }

  const status = highlightError || rewardError ? 207 : 200

  return new Response(JSON.stringify(result), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
})
