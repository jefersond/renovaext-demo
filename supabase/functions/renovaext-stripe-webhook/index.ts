import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleRenovaExtStripeWebhook } from './core.ts';

Deno.serve(async (request) => {
  const webhookSecret = (Deno.env.get('RENOVAEXT_STRIPE_WEBHOOK_SECRET') ?? '').trim();
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const serviceKey = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();

  if (!webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ error: 'RENOVAEXT_STRIPE_NOT_CONFIGURED' }),
      { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } }
    );
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return handleRenovaExtStripeWebhook(request, webhookSecret, {
    async hasProcessedEvent(stripeEventId) {
      const { data } = await db
        .from('renovaext_stripe_events')
        .select('id')
        .eq('stripe_event_id', stripeEventId)
        .limit(1);
      return Boolean(data && data.length > 0);
    },
    async recordEvent(entry) {
      await db.from('renovaext_stripe_events').insert({
        stripe_event_id: entry.stripeEventId,
        event_type: entry.eventType,
        is_test_mode: entry.isTestMode,
        company_id: entry.companyId,
        customer_email: entry.customerEmail,
        plan_code: entry.planCode,
        amount_brl: entry.amountBrl,
        processing_status: entry.processingStatus,
      });
    },
    async activateCompanySubscription(input) {
      const { data: comp } = await db
        .from('companies')
        .select('id')
        .ilike('email', input.customerEmail)
        .eq('is_demo_company', false)
        .limit(1)
        .single();
      if (!comp) return null;

      const now = new Date();
      const validUntil = new Date(now.getTime() + 30 * 86400 * 1000).toISOString();
      await db
        .from('companies')
        .update({
          selected_plan_hypothesis: input.planCode,
          billing_active: true,
          subscription_status: 'assinatura_ativa',
          pilot_ends_at: validUntil,
          activated_at: now.toISOString(),
          payment_reference: input.paymentReference,
          stripe_customer_id: input.stripeCustomerId,
          stripe_subscription_id: input.stripeSubscriptionId,
          updated_at: now.toISOString(),
        })
        .eq('id', comp.id);

      await db.from('audit_logs').insert({
        company_id: comp.id,
        actor_email: 'stripe-webhook',
        action: 'COMPANY_UPDATED',
        details: `Assinatura RenovaExt ativada via Stripe (${input.planCode}, ref ${input.paymentReference}).`,
      });

      return { companyId: comp.id };
    },
  });
});
