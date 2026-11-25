export interface StripeWebhookDataSource {
  hasProcessedEvent: (stripeEventId: string) => Promise<boolean>;
  recordEvent: (entry: {
    stripeEventId: string;
    eventType: string;
    isTestMode: boolean;
    companyId: string | null;
    customerEmail: string | null;
    planCode: 'inicial_49' | 'profissional_79' | null;
    amountBrl: number | null;
    processingStatus: 'processed' | 'ignored_other_product' | 'company_not_found' | 'error';
  }) => Promise<void>;
  activateCompanySubscription: (input: {
    customerEmail: string;
    planCode: 'inicial_49' | 'profissional_79';
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    paymentReference: string;
  }) => Promise<{ companyId: string } | null>;
}

function constantTimeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function verifyStripeWebhookSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  nowEpochSec = Math.floor(Date.now() / 1000),
  toleranceSec = 300
): Promise<boolean> {
  if (!signatureHeader || !webhookSecret) return false;
  const parts = Object.fromEntries(
    signatureHeader
      .split(',')
      .map((part) => part.trim().split('='))
      .filter((pair) => pair.length === 2)
  );
  const timestamp = Number(parts.t);
  const expectedSig = parts.v1;
  if (!Number.isFinite(timestamp) || !expectedSig) return false;
  if (Math.abs(nowEpochSec - timestamp) > toleranceSec) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computedHex = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return constantTimeEqualHex(computedHex, expectedSig.toLowerCase());
}

export function resolveRenovaExtPlanFromEvent(
  metadata: Record<string, unknown> | null | undefined,
  amountCents: number | null | undefined
): 'inicial_49' | 'profissional_79' | null {
  const metaPlan = String(metadata?.plan_code || metadata?.plan || '').trim().toLowerCase();
  if (metaPlan === 'inicial_49') return 'inicial_49';
  if (metaPlan === 'profissional_79') return 'profissional_79';
  if (amountCents === 4900) return 'inicial_49';
  if (amountCents === 7900) return 'profissional_79';
  return null;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

/**
 * Processa eventos Stripe EXCLUSIVAMENTE do produto RenovaExt (`metadata.product === 'renovaext'`).
 * Qualquer evento da Zuno Propect ou de outro produto é ignorado com HTTP 200 sem alterar dados.
 */
export async function handleRenovaExtStripeWebhook(
  request: Request,
  webhookSecret: string,
  dataSource: StripeWebhookDataSource,
  nowEpochSec?: number
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);
  }

  const rawBody = await request.text();
  const sigHeader = request.headers.get('stripe-signature') ?? '';
  const validSig = await verifyStripeWebhookSignature(rawBody, sigHeader, webhookSecret, nowEpochSec);
  if (!validSig) {
    return jsonResponse({ error: 'INVALID_STRIPE_SIGNATURE' }, 400);
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: 'INVALID_JSON' }, 400);
  }

  const stripeEventId = String(event.id || '').trim();
  const eventType = String(event.type || '').trim();
  const isTestMode = event.livemode !== true;
  const dataObj = ((event.data as Record<string, unknown> | undefined)?.object ?? {}) as Record<
    string,
    unknown
  >;
  const metadata = (dataObj.metadata ?? {}) as Record<string, unknown>;

  if (!stripeEventId || !eventType) {
    return jsonResponse({ error: 'MISSING_EVENT_FIELDS' }, 400);
  }

  if (await dataSource.hasProcessedEvent(stripeEventId)) {
    return jsonResponse({ ok: true, idempotent: true, stripeEventId }, 200);
  }

  // Isolamento estrito contra interferência com a Zuno Propect:
  const productTag = String(metadata.product || '').trim().toLowerCase();
  if (productTag !== 'renovaext') {
    await dataSource.recordEvent({
      stripeEventId,
      eventType,
      isTestMode,
      companyId: null,
      customerEmail: null,
      planCode: null,
      amountBrl: null,
      processingStatus: 'ignored_other_product',
    });
    return jsonResponse({ ok: true, ignored: true, reason: 'NOT_RENOVAEXT_PRODUCT' }, 200);
  }

  if (eventType !== 'checkout.session.completed' && eventType !== 'invoice.paid') {
    await dataSource.recordEvent({
      stripeEventId,
      eventType,
      isTestMode,
      companyId: null,
      customerEmail: null,
      planCode: null,
      amountBrl: null,
      processingStatus: 'processed',
    });
    return jsonResponse({ ok: true, ignored: true, reason: 'UNHANDLED_EVENT_TYPE' }, 200);
  }

  const customerDetails = (dataObj.customer_details ?? {}) as Record<string, unknown>;
  const customerEmail = String(
    dataObj.customer_email || customerDetails.email || metadata.company_email || ''
  )
    .trim()
    .toLowerCase();
  const amountCents = Number(dataObj.amount_total ?? dataObj.amount_paid ?? 0);
  const planCode = resolveRenovaExtPlanFromEvent(metadata, amountCents);
  const stripeCustomerId = dataObj.customer ? String(dataObj.customer) : null;
  const stripeSubscriptionId = dataObj.subscription ? String(dataObj.subscription) : null;

  if (!customerEmail || !planCode) {
    await dataSource.recordEvent({
      stripeEventId,
      eventType,
      isTestMode,
      companyId: null,
      customerEmail: customerEmail || null,
      planCode,
      amountBrl: amountCents > 0 ? amountCents / 100 : null,
      processingStatus: 'error',
    });
    return jsonResponse({ error: 'MISSING_CUSTOMER_OR_PLAN' }, 422);
  }

  const activated = await dataSource.activateCompanySubscription({
    customerEmail,
    planCode,
    stripeCustomerId,
    stripeSubscriptionId,
    paymentReference: `stripe:${stripeEventId}`,
  });

  if (!activated) {
    await dataSource.recordEvent({
      stripeEventId,
      eventType,
      isTestMode,
      companyId: null,
      customerEmail,
      planCode,
      amountBrl: amountCents > 0 ? amountCents / 100 : null,
      processingStatus: 'company_not_found',
    });
    return jsonResponse({ ok: true, status: 'company_not_found', customerEmail }, 200);
  }

  await dataSource.recordEvent({
    stripeEventId,
    eventType,
    isTestMode,
    companyId: activated.companyId,
    customerEmail,
    planCode,
    amountBrl: amountCents > 0 ? amountCents / 100 : null,
    processingStatus: 'processed',
  });

  return jsonResponse(
    {
      ok: true,
      activated: true,
      isTestMode,
      companyId: activated.companyId,
      planCode,
    },
    200
  );
}
