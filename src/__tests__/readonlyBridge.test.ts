import { describe, expect, it } from 'vitest'
import { handleRenovaExtReadOnlyFeed } from '../../supabase/functions/renovaext-crm-readonly-feed/core'

const VALID_TOKEN = 'renovaext_ro_test_token_1234567890abcdef'

describe('RenovaExt CRM Readonly Bridge — Segurança e Isolamento', () => {
  it('rejeita origem de navegador (403) e requisições sem token válido (401)', async () => {
    const audits: Array<{ statusCode: number; safeNote?: string }> = []
    const ds = {
      fetchCommercialSnapshot: async () => ({ leads: [], pipeline: [], excludedTestCount: 0 }),
      recordAudit: async (entry: { statusCode: number; safeNote?: string }) => {
        audits.push(entry)
      },
    }

    const browserReq = new Request('https://renovaext.example/functions/v1/renovaext-crm-readonly-feed', {
      method: 'GET',
      headers: { Origin: 'https://zanotelligrupo.online', 'x-renovaext-readonly-token': VALID_TOKEN },
    })
    const browserRes = await handleRenovaExtReadOnlyFeed(browserReq, VALID_TOKEN, ds)
    expect(browserRes.status).toBe(403)

    const unauthReq = new Request('https://renovaext.example/functions/v1/renovaext-crm-readonly-feed', {
      method: 'GET',
      headers: { 'x-renovaext-readonly-token': 'invalid' },
    })
    const unauthRes = await handleRenovaExtReadOnlyFeed(unauthReq, VALID_TOKEN, ds)
    expect(unauthRes.status).toBe(401)
    expect(audits.map((a) => a.statusCode)).toEqual([403, 401])
  })

  it('retorna ZERO quando não há leads reais e nunca substitui por demos fictícias', async () => {
    const req = new Request('https://renovaext.example/functions/v1/renovaext-crm-readonly-feed', {
      method: 'GET',
      headers: { 'x-renovaext-readonly-token': VALID_TOKEN },
    })
    const res = await handleRenovaExtReadOnlyFeed(req, VALID_TOKEN, {
      fetchCommercialSnapshot: async () => ({
        leads: [
          {
            id: 'test-1',
            protocol_code: 'SOL-TEST-1',
            intent_type: 'solicitar_demonstracao',
            responsible_name: 'Teste Interno',
            workshop_name: 'Oficina Teste QA',
            email: 'qa@test.local',
            phone: null,
            portfolio_size: 'ate_50_clientes',
            plan_interest: 'inicial_49',
            suggested_plan: 'inicial_49',
            crm_status: 'recebido_aguardando_contato',
            notes: null,
            founder_notes: null,
            is_test_submission: true,
            created_at: '2026-11-16T12:00:00Z',
            updated_at: '2026-11-16T12:00:00Z',
          },
          {
            id: 'lgpd-1',
            protocol_code: 'SOL-LGPD-1',
            intent_type: 'solicitacao_titular_lgpd',
            responsible_name: 'Titular Dados',
            workshop_name: 'Solicitação LGPD',
            email: 'titular@exemplo.com',
            phone: null,
            portfolio_size: 'nao_aplicavel_lgpd',
            plan_interest: 'nao_selecionado',
            suggested_plan: 'nao_aplicavel',
            crm_status: 'recebido_aguardando_contato',
            notes: null,
            founder_notes: null,
            is_test_submission: false,
            created_at: '2026-11-16T12:00:00Z',
            updated_at: '2026-11-16T12:00:00Z',
          },
        ],
        pipeline: [],
        excludedTestCount: 1,
      }),
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.realCustomerIndicators.realLeadsTotal).toBe(0)
    expect(body.leads).toEqual([])
  })

  it('retorna apenas interessados comerciais reais com indicadores verdadeiros e registra auditoria', async () => {
    const audits: Array<{ leadsReturned: number; statusCode: number }> = []
    const req = new Request('https://renovaext.example/functions/v1/renovaext-crm-readonly-feed', {
      method: 'GET',
      headers: { 'x-renovaext-readonly-token': VALID_TOKEN },
    })

    const res = await handleRenovaExtReadOnlyFeed(req, VALID_TOKEN, {
      fetchCommercialSnapshot: async () => ({
        leads: [
          {
            id: 'lead-real-1',
            protocol_code: 'SOL-20261116-REAL01',
            intent_type: 'solicitar_demonstracao',
            responsible_name: 'Marcos Oliveira',
            workshop_name: 'Extintores Vitória Ltda',
            email: 'marcos@extintoresvitoria.com.br',
            phone: '(27) 99811-2233',
            portfolio_size: '151_a_300_clientes',
            plan_interest: 'profissional_79',
            suggested_plan: 'profissional_79',
            crm_status: 'recebido_aguardando_contato',
            notes: 'Perde renovações anuais de condomínios',
            founder_notes: null,
            is_test_submission: false,
            created_at: '2026-11-16T14:00:00Z',
            updated_at: '2026-11-16T14:00:00Z',
          },
        ],
        pipeline: [
          {
            id: 'pipe-1',
            lead_code: 'SOL-20261116-REAL01',
            source_channel: 'formulario_publico_inbound',
            workshop_name: 'Extintores Vitória Ltda',
            responsible_name: 'Marcos Oliveira',
            city_uf: 'Vitória/ES',
            portfolio_size: '151_a_300_clientes',
            plan_interest: 'profissional_79',
            suggested_plan: 'profissional_79',
            funnel_status: 'recebido_aguardando_contato',
            demo_requested: true,
            payment_confirmed: false,
            paid_amount_brl: null,
            is_test_record: false,
            updated_at: '2026-11-16T14:00:00Z',
          },
        ],
        excludedTestCount: 2,
      }),
      recordAudit: async (entry) => {
        audits.push({ leadsReturned: entry.leadsReturned, statusCode: entry.statusCode })
      },
    })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.realCustomerIndicators.realLeadsTotal).toBe(1)
    expect(body.realCustomerIndicators.realDemoRequests).toBe(1)
    expect(body.realCustomerIndicators.confirmedPaidPilots).toBe(0)
    expect(body.leads[0].workshopName).toBe('Extintores Vitória Ltda')
    expect(audits).toEqual([{ leadsReturned: 1, statusCode: 200 }])
  })
})
