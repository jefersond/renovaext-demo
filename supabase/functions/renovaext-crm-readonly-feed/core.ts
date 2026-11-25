export interface ReadonlyFeedRowLead {
  id: string
  protocol_code: string
  intent_type: string
  responsible_name: string
  workshop_name: string
  email: string | null
  phone: string | null
  portfolio_size: string
  plan_interest: string
  suggested_plan: string
  crm_status: string
  notes: string | null
  founder_notes: string | null
  is_test_submission: boolean
  created_at: string
  updated_at: string
}

export interface ReadonlyFeedRowPipeline {
  id: string
  lead_code: string
  source_channel: string
  workshop_name: string
  responsible_name: string | null
  city_uf: string | null
  email?: string | null
  phone?: string | null
  website_url?: string | null
  portfolio_size: string | null
  plan_interest: string
  suggested_plan: string
  funnel_status: string
  demo_requested: boolean
  payment_confirmed: boolean
  paid_amount_brl: number | null
  eligible_channel?: string | null
  personalization_hook?: string | null
  outreach_draft_subject?: string | null
  outreach_draft_body?: string | null
  opt_out?: boolean | null
  is_test_record: boolean
  updated_at: string
}

export interface ReadonlyFeedDataSource {
  fetchCommercialSnapshot: () => Promise<{
    leads: ReadonlyFeedRowLead[]
    pipeline: ReadonlyFeedRowPipeline[]
    excludedTestCount: number
  }>
  recordAudit?: (entry: {
    consumerName: string
    method: string
    statusCode: number
    leadsReturned: number
    pipelineReturned: number
    safeNote?: string
  }) => Promise<void>
}

export function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder()
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index]
  }
  return diff === 0
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
    },
  })
}

export async function handleRenovaExtReadOnlyFeed(
  request: Request,
  expectedToken: string,
  dataSource: ReadonlyFeedDataSource,
): Promise<Response> {
  if (request.method !== 'GET') {
    await dataSource.recordAudit?.({
      consumerName: 'unknown',
      method: request.method,
      statusCode: 405,
      leadsReturned: 0,
      pipelineReturned: 0,
      safeNote: 'METHOD_NOT_ALLOWED',
    })
    return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405)
  }

  // Ponte estritamente backend-to-backend: navegadores nunca consomem este endpoint diretamente.
  if (request.headers.has('origin')) {
    await dataSource.recordAudit?.({
      consumerName: 'browser-origin',
      method: request.method,
      statusCode: 403,
      leadsReturned: 0,
      pipelineReturned: 0,
      safeNote: 'BROWSER_ORIGIN_REJECTED',
    })
    return jsonResponse({ error: 'BROWSER_ORIGIN_REJECTED' }, 403)
  }

  const providedToken = (request.headers.get('x-renovaext-readonly-token') ?? '').trim()
  if (!expectedToken || expectedToken.length < 32 || !constantTimeEqual(providedToken, expectedToken)) {
    await dataSource.recordAudit?.({
      consumerName: 'unauthorized',
      method: request.method,
      statusCode: 401,
      leadsReturned: 0,
      pipelineReturned: 0,
      safeNote: 'UNAUTHORIZED',
    })
    return jsonResponse({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const snapshot = await dataSource.fetchCommercialSnapshot()
    // Filtro rigoroso: exclui submissões técnicas de teste e solicitações LGPD do funil comercial.
    const realLeads = snapshot.leads.filter(
      (row) => row.is_test_submission === false && row.intent_type !== 'solicitacao_titular_lgpd',
    )
    const realPipeline = snapshot.pipeline.filter((row) => row.is_test_record === false)

    const leads = realLeads.map((row) => ({
      id: row.id,
      protocolCode: row.protocol_code,
      intentType: row.intent_type,
      responsibleName: row.responsible_name,
      workshopName: row.workshop_name,
      email: row.email,
      phone: row.phone,
      portfolioSize: row.portfolio_size,
      planInterest: row.plan_interest,
      suggestedPlan: row.suggested_plan,
      crmStatus: row.crm_status,
      notes: row.notes,
      founderNotes: row.founder_notes,
      isTestSubmission: false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    const crmPipeline = realPipeline.map((row) => ({
      id: row.id,
      leadCode: row.lead_code,
      sourceChannel: row.source_channel,
      workshopName: row.workshop_name,
      responsibleName: row.responsible_name,
      cityUf: row.city_uf,
      email: row.email ?? null,
      phone: row.phone ?? null,
      websiteUrl: row.website_url ?? null,
      portfolioSize: row.portfolio_size,
      planInterest: row.plan_interest,
      suggestedPlan: row.suggested_plan,
      funnelStatus: row.funnel_status,
      demoRequested: row.demo_requested,
      paymentConfirmed: row.payment_confirmed,
      paidAmountBrl: row.paid_amount_brl,
      eligibleChannel: row.eligible_channel ?? null,
      personalizationHook: row.personalization_hook ?? null,
      outreachDraftSubject: row.outreach_draft_subject ?? null,
      outreachDraftBody: row.outreach_draft_body ?? null,
      optOut: Boolean(row.opt_out),
      isTestRecord: false,
      updatedAt: row.updated_at,
    }))

    const confirmedPaidFromPipeline = crmPipeline.filter((p) => p.paymentConfirmed).length
    const confirmedPaidFromLeads = leads.filter((l) => l.crmStatus === 'piloto_pago_confirmado').length
    const totalPaidRevenueBrl = crmPipeline
      .filter((p) => p.paymentConfirmed && Number(p.paidAmountBrl || 0) > 0)
      .reduce((acc, p) => acc + Number(p.paidAmountBrl || 0), 0)
    const outboundProspects = crmPipeline.filter((p) => p.sourceChannel !== 'formulario_publico_inbound')
    const readyDraftsCount = outboundProspects.filter((p) => Boolean(p.outreachDraftBody) && !p.optOut).length

    await dataSource.recordAudit?.({
      consumerName: 'zanotelli-os',
      method: request.method,
      statusCode: 200,
      leadsReturned: leads.length,
      pipelineReturned: crmPipeline.length,
      safeNote: 'READONLY_FEED_OK',
    })

    return jsonResponse({
      ok: true,
      realCustomerIndicators: {
        realLeadsTotal: leads.length,
        realPendingContact: leads.filter((l) => l.crmStatus === 'recebido_aguardando_contato').length,
        realDemoRequests: leads.filter((l) => l.intentType === 'solicitar_demonstracao').length,
        realPilotRequests: leads.filter((l) => l.intentType === 'quero_participar_piloto').length,
        confirmedPaidPilots: Math.max(confirmedPaidFromLeads, confirmedPaidFromPipeline),
        totalPaidRevenueBrl,
        outboundProspectsTotal: outboundProspects.length,
        readyDraftsCount,
        excludedTechnicalTestRecords: snapshot.excludedTestCount,
      },
      leads,
      crmPipeline,
    }, 200)
  } catch {
    await dataSource.recordAudit?.({
      consumerName: 'zanotelli-os',
      method: request.method,
      statusCode: 503,
      leadsReturned: 0,
      pipelineReturned: 0,
      safeNote: 'DATABASE_READ_FAILED',
    })
    return jsonResponse({ error: 'DATABASE_ERROR' }, 503)
  }
}
