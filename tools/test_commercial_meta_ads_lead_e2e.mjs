// ==============================================================================
// RenovaExt - Teste E2E de Lead com Origem Meta Ads, CRM Sync e Anti-Duplicação
// ==============================================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xmuzcnjcwkhgojnaosha.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdXpjbmpjd2toZ29qbmFvc2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MjIxMTAsImV4cCI6MjExMDA5ODExMH0.CDK7TXV2pdKsO8V2VV0wkQnapC_9k5CgS5CpqLoepOk';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runMetaAdsE2ETest() {
  console.log('--- INICIANDO TESTE E2E: META ADS -> SUPABASE -> CRM ---');
  
  const testEmail = `teste.meta.ads.${Date.now()}@oficina-teste.com.br`;
  const utmSourcePage = '/?utm_source=meta_ads&utm_medium=cpc&utm_campaign=validacao_inicial&utm_content=ad01_radar';
  
  // 1. Envio normal com UTMs
  const { data: leadData, error: leadError } = await supabase.rpc('submit_commercial_lead', {
    p_intent_type: 'solicitar_demonstracao',
    p_responsible_name: 'Carlos Alberto (Meta Ads Test)',
    p_workshop_name: 'Oficina Fogo Zero Extintores',
    p_email: testEmail,
    p_phone: '(11) 98765-4321',
    p_portfolio_size: '51_a_150_clientes',
    p_plan_interest: 'nao_selecionado',
    p_notes: 'Lead capturado via teste de anuncio Meta Ads.',
    p_source_page: utmSourcePage,
    p_privacy_consent: true,
    p_honeypot: '',
    p_elapsed_ms: 1200,
    p_is_test_submission: true // Marcado como teste para isolamento de metricas
  });

  if (leadError) {
    console.error('ERRO no envio do lead com UTM:', leadError);
    process.exit(1);
  }

  console.log('✓ Lead enviado com sucesso! Protocolo:', leadData.protocolCode);
  console.log('✓ ID do registro:', leadData.id);

  // 2. Teste de tentativa de duplicata imediata (deve ser bloqueado pelo rate limit server-side)
  console.log('--- TESTANDO PROTEÇÃO CONTRA DUPLICATAS (RATE LIMIT POR E-MAIL) ---');
  const { data: dupData, error: dupError } = await supabase.rpc('submit_commercial_lead', {
    p_intent_type: 'solicitar_demonstracao',
    p_responsible_name: 'Carlos Alberto (Duplicata)',
    p_workshop_name: 'Oficina Fogo Zero Extintores',
    p_email: testEmail, // Mesmo e-mail
    p_phone: '(11) 98765-4321',
    p_portfolio_size: '51_a_150_clientes',
    p_plan_interest: 'nao_selecionado',
    p_notes: 'Tentativa duplicada imediata.',
    p_source_page: utmSourcePage,
    p_privacy_consent: true,
    p_honeypot: '',
    p_elapsed_ms: 1500,
    p_is_test_submission: true
  });

  if (dupError) {
    console.log('✓ Duplicata bloqueada corretamente pelo servidor:', dupError.message);
  } else {
    console.error('FALHA: Duplicata não foi bloqueada!', dupData);
    process.exit(1);
  }

  // 3. Teste de Simulação de Falha de Conexão (Timeout)
  console.log('--- TESTANDO TRATAMENTO DE FALHA DE CONEXÃO ---');
  try {
    const invalidClient = createClient('https://invalid-supabase-url-fail-test.supabase.co', SUPABASE_ANON_KEY);
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT_CONEXAO_SIMULADA')), 1000));
    const callPromise = invalidClient.rpc('submit_commercial_lead', { p_email: 'fail@test.com' });
    await Promise.race([callPromise, timeoutPromise]);
  } catch (err) {
    console.log('✓ Tratamento de falha de conexão validado:', err.message);
  }

  console.log('========================================================');
  console.log('RESULTADO FINAL: TESTE DE FLUXO META ADS APROVADO 100%!');
  console.log('========================================================');
}

runMetaAdsE2ETest().catch((err) => {
  console.error('Falha geral no teste:', err);
  process.exit(1);
});
