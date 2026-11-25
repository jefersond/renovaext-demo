import { createClient } from 'npm:@supabase/supabase-js@2'
import { handleRenovaExtReadOnlyFeed, type ReadonlyFeedRowLead, type ReadonlyFeedRowPipeline } from './core.ts'

Deno.serve(async (request) => {
  const expectedToken = (Deno.env.get('RENOVAEXT_CRM_READONLY_TOKEN') ?? '').trim()
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'SERVER_MISCONFIGURED' }), {
      status: 503,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return handleRenovaExtReadOnlyFeed(request, expectedToken, {
    async fetchCommercialSnapshot() {
      const [leadsRes, pipeRes, testCountRes] = await Promise.all([
        db
          .from('commercial_leads')
          .select(
            'id,protocol_code,intent_type,responsible_name,workshop_name,email,phone,portfolio_size,plan_interest,suggested_plan,crm_status,notes,founder_notes,is_test_submission,created_at,updated_at',
          )
          .eq('is_test_submission', false)
          .neq('intent_type', 'solicitacao_titular_lgpd')
          .order('created_at', { ascending: false })
          .limit(100),
        db
          .from('commercial_crm_pipeline')
          .select(
            'id,lead_code,source_channel,workshop_name,responsible_name,city_uf,email,phone,website_url,portfolio_size,plan_interest,suggested_plan,funnel_status,demo_requested,payment_confirmed,paid_amount_brl,eligible_channel,personalization_hook,outreach_draft_subject,outreach_draft_body,opt_out,is_test_record,updated_at',
          )
          .eq('is_test_record', false)
          .order('lead_code', { ascending: true })
          .limit(100),
        db
          .from('commercial_leads')
          .select('id', { count: 'exact', head: true })
          .eq('is_test_submission', true),
      ])

      if (leadsRes.error || pipeRes.error) {
        throw new Error('DATABASE_ERROR')
      }

      return {
        leads: (leadsRes.data ?? []) as ReadonlyFeedRowLead[],
        pipeline: (pipeRes.data ?? []) as ReadonlyFeedRowPipeline[],
        excludedTestCount: Number(testCountRes.count ?? 0),
      }
    },
    async recordAudit(entry) {
      await db.from('readonly_bridge_access_logs').insert({
        consumer_name: entry.consumerName,
        request_method: entry.method,
        status_code: entry.statusCode,
        leads_returned: entry.leadsReturned,
        pipeline_returned: entry.pipelineReturned,
        safe_note: entry.safeNote ?? null,
      })
    },
  })
})
