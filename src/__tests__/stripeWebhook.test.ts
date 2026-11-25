import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import {
  handleRenovaExtStripeWebhook,
  type StripeWebhookDataSource,
} from '../../supabase/functions/renovaext-stripe-webhook/core';

function signStripePayload(payload: string, secret: string, ts: number): string {
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

describe('RenovaExt Stripe Webhook — Isolamento Zuno, HMAC, Idempotência e Ativação', () => {
  const secret = 'whsec_test_renovaext_isolated_only_1234567890';
  const nowSec = 1795000000;

  function makeMockSource() {
    const events = new Map<string, string>();
    const activations: Array<{ email: string; plan: string }> = [];
    const ds: StripeWebhookDataSource = {
      hasProcessedEvent: async (id) => events.has(id),
      recordEvent: async (entry) => {
        events.set(entry.stripeEventId, entry.processingStatus);
      },
      activateCompanySubscription: async (input) => {
        activations.push({ email: input.customerEmail, plan: input.planCode });
        return { companyId: '11111111-1111-4111-8111-111111111111' };
      },
    };
    return { ds, events, activations };
  }

  it('Rejeita requisição com assinatura HMAC inválida (HTTP 400)', async () => {
    const { ds } = makeMockSource();
    const req = new Request('https://xmuzcnjcwkhgojnaosha.supabase.co/functions/v1/renovaext-stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': `t=${nowSec},v1=deadbeef` },
      body: JSON.stringify({ id: 'evt_bad', type: 'checkout.session.completed' }),
    });
    const res = await handleRenovaExtStripeWebhook(req, secret, ds, nowSec);
    expect(res.status).toBe(400);
  });

  it('Ignora eventos da Zuno Propect (metadata.product != renovaext) sem ativar nenhuma empresa', async () => {
    const { ds, events, activations } = makeMockSource();
    const payload = JSON.stringify({
      id: 'evt_zuno_001',
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          customer_email: 'cliente@zuno.com.br',
          amount_total: 4700,
          metadata: { product: 'zuno', plan: 'starter' },
        },
      },
    });
    const req = new Request('https://xmuzcnjcwkhgojnaosha.supabase.co/functions/v1/renovaext-stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': signStripePayload(payload, secret, nowSec) },
      body: payload,
    });
    const res = await handleRenovaExtStripeWebhook(req, secret, ds, nowSec);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.ignored).toBe(true);
    expect(json.reason).toBe('NOT_RENOVAEXT_PRODUCT');
    expect(activations.length).toBe(0);
    expect(events.get('evt_zuno_001')).toBe('ignored_other_product');
  });

  it('Ativa assinatura RenovaExt (R$ 49/mês) em modo teste e garante idempotência no reenvio', async () => {
    const { ds, activations } = makeMockSource();
    const payload = JSON.stringify({
      id: 'evt_renovaext_test_049',
      type: 'checkout.session.completed',
      livemode: false,
      data: {
        object: {
          customer: 'cus_test_01',
          subscription: 'sub_test_01',
          customer_email: 'oficina@exemplo.com.br',
          amount_total: 4900,
          metadata: { product: 'renovaext', plan_code: 'inicial_49' },
        },
      },
    });
    const sig = signStripePayload(payload, secret, nowSec);
    const req1 = new Request('https://xmuzcnjcwkhgojnaosha.supabase.co/functions/v1/renovaext-stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': sig },
      body: payload,
    });
    const res1 = await handleRenovaExtStripeWebhook(req1, secret, ds, nowSec);
    const body1 = await res1.json();
    expect(res1.status).toBe(200);
    expect(body1.activated).toBe(true);
    expect(body1.planCode).toBe('inicial_49');
    expect(body1.isTestMode).toBe(true);
    expect(activations).toHaveLength(1);

    // Segundo envio do mesmo evento deve responder idempotent=true sem reativar
    const req2 = new Request('https://xmuzcnjcwkhgojnaosha.supabase.co/functions/v1/renovaext-stripe-webhook', {
      method: 'POST',
      headers: { 'stripe-signature': sig },
      body: payload,
    });
    const res2 = await handleRenovaExtStripeWebhook(req2, secret, ds, nowSec);
    const body2 = await res2.json();
    expect(res2.status).toBe(200);
    expect(body2.idempotent).toBe(true);
    expect(activations).toHaveLength(1);
  });
});
