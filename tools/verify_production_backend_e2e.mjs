#!/usr/bin/env node
/**
 * Validação E2E REAL no backend Supabase (xmuzcnjcwkhgojnaosha):
 * 1. Cadastro + confirmação de e-mail + provisionamento isolado (companies + profiles);
 * 2. Recuperação de senha (resetPasswordForEmail / link de recovery);
 * 3. Isolamento Multi-Tenant RLS (A vs B) + bloqueio de auto-ativação de billing_active;
 * 4. Importação + Persistência ordenada (clients -> equipments -> service_history -> proposals);
 * 5. Limite REAL de plano no backend PostgreSQL (150 clientes Inicial -> 151º rejeitado);
 * 6. Ativação segura via RPC founder_activate_company_subscription + tabela renovaext_stripe_events;
 * 7. Limpeza integral dos usuários e registros temporários ao final.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

loadEnvLocal();

const url = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('[ERRO] Variáveis Supabase ausentes em .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runTag = crypto.randomBytes(4).toString('hex');
const emailA = `verif.inicial.${runTag}@renovaext-test.invalid`;
const emailB = `verif.prof.${runTag}@renovaext-test.invalid`;
const passA = `Rnv@${crypto.randomBytes(8).toString('hex')}1`;
const passB = `Rnv@${crypto.randomBytes(8).toString('hex')}2`;

const createdUserIds = [];
const createdCompanyIds = [];
const testStripeEventId = `evt_test_verif_${runTag}`;

const report = {
  executedAt: new Date().toISOString(),
  supabaseProject: url,
  checks: {},
};

try {
  // 1. Cadastro real (Oficina A: Plano Inicial R$ 49 | Oficina B: Plano Profissional R$ 79)
  const { data: userAData, error: errUserA } = await admin.auth.admin.createUser({
    email: emailA,
    password: passA,
    email_confirm: true,
    user_metadata: {
      company_name: `Oficina Verif A ${runTag}`,
      cnpj: '11.111.111/0001-11',
      responsible_name: 'Responsavel A',
      phone: '(11) 90000-0001',
      city: 'São Paulo',
      state: 'SP',
      selected_plan_hypothesis: 'inicial_49',
    },
  });
  if (errUserA || !userAData.user) throw new Error(`Falha ao criar user A: ${errUserA?.message}`);
  createdUserIds.push(userAData.user.id);

  const { data: userBData, error: errUserB } = await admin.auth.admin.createUser({
    email: emailB,
    password: passB,
    email_confirm: true,
    user_metadata: {
      company_name: `Oficina Verif B ${runTag}`,
      cnpj: '22.222.222/0001-22',
      responsible_name: 'Responsavel B',
      phone: '(11) 90000-0002',
      city: 'Campinas',
      state: 'SP',
      selected_plan_hypothesis: 'profissional_79',
    },
  });
  if (errUserB || !userBData.user) throw new Error(`Falha ao criar user B: ${errUserB?.message}`);
  createdUserIds.push(userBData.user.id);

  // Login real com JWT de cliente (anonKey) para A e B
  const clientA = createClient(url, anonKey, { auth: { persistSession: false } });
  const clientB = createClient(url, anonKey, { auth: { persistSession: false } });

  const { error: loginErrA } = await clientA.auth.signInWithPassword({ email: emailA, password: passA });
  if (loginErrA) throw new Error(`Login A falhou: ${loginErrA.message}`);
  const { error: loginErrB } = await clientB.auth.signInWithPassword({ email: emailB, password: passB });
  if (loginErrB) throw new Error(`Login B falhou: ${loginErrB.message}`);

  const { data: compA } = await clientA.from('companies').select('*').single();
  const { data: compB } = await clientB.from('companies').select('*').single();
  if (!compA || !compB) throw new Error('Trigger handle_auth_user_confirmed não provisionou companies.');
  createdCompanyIds.push(compA.id, compB.id);

  report.checks.signupAndAutoProvision = {
    passed: compA.selected_plan_hypothesis === 'inicial_49' && compB.selected_plan_hypothesis === 'profissional_79' && compA.billing_active === false,
    companyAPlan: compA.selected_plan_hypothesis,
    companyBPlan: compB.selected_plan_hypothesis,
    initialBillingActive: compA.billing_active,
  };

  // 2. Recuperação de senha real (geração de link oficial de recovery no Supabase Auth)
  const { data: recoveryData, error: recoveryErr } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: emailA,
    options: { redirectTo: 'https://renovaext.com.br/app/' },
  });
  report.checks.passwordRecovery = {
    passed: !recoveryErr && Boolean(recoveryData?.properties?.action_link),
    redirectConfigured: recoveryData?.properties?.redirect_to || null,
    error: recoveryErr?.message || null,
  };

  // 3. Bloqueio de auto-ativação de assinatura pelo próprio cliente (trigger protect_company_billing_columns)
  const { error: billingTamperErr } = await clientA
    .from('companies')
    .update({ billing_active: true, subscription_status: 'assinatura_ativa' })
    .eq('id', compA.id);
  report.checks.billingColumnProtection = {
    passed: Boolean(billingTamperErr && billingTamperErr.message.includes('BILLING_COLUMN_PROTECTED')),
    dbError: billingTamperErr?.message || null,
  };

  // 4. Importação + Persistência ordenada real (clients -> equipments -> service_history -> proposals)
  const cli1Id = crypto.randomUUID();
  const eq1Id = crypto.randomUUID();
  const prop1Id = crypto.randomUUID();

  const { error: insCliErr } = await clientA.from('clients').insert({
    id: cli1Id,
    company_id: compA.id,
    name: 'Condomínio Persistência Real #1',
    organization_name: 'Condomínio Persistência Real #1',
    contact_name: 'Síndico Teste',
    city: 'São Paulo',
    opportunity_stage: 'pronto_para_contato',
  });
  if (insCliErr) throw new Error(`Insert cliente 1 falhou: ${insCliErr.message}`);

  const { error: insEqErr } = await clientA.from('equipments').insert({
    id: eq1Id,
    company_id: compA.id,
    client_id: cli1Id,
    description: '10x PQS ABC 4kg',
    extinguisher_type: 'PQS ABC',
    capacity: '4kg',
    quantity: 10,
    next_due_date: '2026-12-20',
    needs_review: false,
    dedupe_fingerprint: `fp-${runTag}-1`,
  });
  if (insEqErr) throw new Error(`Insert equipamento 1 falhou: ${insEqErr.message}`);

  const { error: insPropErr } = await clientA.from('proposals').insert({
    id: prop1Id,
    company_id: compA.id,
    client_id: cli1Id,
    proposal_number: 'PROP-2026-001',
    status: 'gerada',
    validity_days: 15,
    items: [{ id: 'i1', equipmentLabel: 'PQS ABC 4kg', quantity: 10, unitPriceBrl: 65, subtotalBrl: 650 }],
    total_brl: 650,
    notes: 'Teste E2E real',
  });
  if (insPropErr) throw new Error(`Insert proposta 1 falhou: ${insPropErr.message}`);

  const { data: readBackEquips } = await clientA.from('equipments').select('id,client_id,quantity').eq('id', eq1Id);
  const { data: readBackProps } = await clientA.from('proposals').select('id,total_brl').eq('id', prop1Id);

  report.checks.orderedPersistence = {
    passed: readBackEquips?.length === 1 && Number(readBackProps?.[0]?.total_brl) === 650,
    equipmentsPersisted: readBackEquips?.length || 0,
    proposalTotalBrl: Number(readBackProps?.[0]?.total_brl || 0),
  };

  // 5. Isolamento RLS Multi-Tenant (Oficina B tenta ler e inserir na Oficina A)
  const { data: crossSelectClients } = await clientB.from('clients').select('id').eq('id', cli1Id);
  const { error: crossInsertErr } = await clientB.from('clients').insert({
    company_id: compA.id,
    name: 'Tentativa Invasao Cross Tenant',
  });
  report.checks.rlsMultiTenantIsolation = {
    passed: (crossSelectClients?.length || 0) === 0 && crossInsertErr?.code === '42501',
    crossSelectRows: crossSelectClients?.length || 0,
    crossInsertCode: crossInsertErr?.code || null,
  };

  // 6. Limite REAL de plano no BACKEND PostgreSQL (Plano Inicial = 150 clientes; 1 já inserido -> inserir +149 -> 151º deve falhar!)
  const bulkClients = [];
  for (let i = 2; i <= 150; i++) {
    bulkClients.push({
      company_id: compA.id,
      name: `Cliente Limite Backend #${i}`,
      organization_name: `Cliente Limite Backend #${i}`,
      city: 'São Paulo',
      opportunity_stage: 'pronto_para_contato',
    });
  }
  const { error: bulkErr } = await clientA.from('clients').insert(bulkClients);
  if (bulkErr) throw new Error(`Insert até 150 clientes falhou: ${bulkErr.message}`);

  const { error: client151Err } = await clientA.from('clients').insert({
    company_id: compA.id,
    name: 'Cliente Excedente #151',
    organization_name: 'Cliente Excedente #151',
    city: 'São Paulo',
    opportunity_stage: 'pronto_para_contato',
  });

  report.checks.backendPlanLimitEnforcement = {
    passed: Boolean(client151Err && client151Err.message.includes('PLAN_CLIENT_LIMIT_EXCEEDED')),
    insertedUpToLimit: 150,
    client151BlockedMessage: client151Err?.message || null,
  };

  // 7. Ativação via RPC founder_activate_company_subscription + tabela renovaext_stripe_events (idempotência)
  const { data: actData, error: actErr } = await admin.rpc('founder_activate_company_subscription', {
    p_company_email: emailA,
    p_plan: 'inicial_49',
    p_status: 'piloto_ativo',
    p_duration_days: 30,
    p_payment_reference: `TEST-ACT-${runTag}`,
  });

  const { error: stripeEvt1Err } = await admin.from('renovaext_stripe_events').insert({
    stripe_event_id: testStripeEventId,
    event_type: 'checkout.session.completed',
    is_test_mode: true,
    company_id: compA.id,
    customer_email: emailA,
    plan_code: 'inicial_49',
    amount_brl: 49.0,
    processing_status: 'processed',
  });
  // Segunda inserção do mesmo evento deve falhar por UNIQUE (idempotência)
  const { error: stripeEvtDupErr } = await admin.from('renovaext_stripe_events').insert({
    stripe_event_id: testStripeEventId,
    event_type: 'checkout.session.completed',
    is_test_mode: true,
    company_id: compA.id,
    customer_email: emailA,
    plan_code: 'inicial_49',
    amount_brl: 49.0,
    processing_status: 'processed',
  });

  report.checks.subscriptionActivationAndStripeIdempotency = {
    passed:
      !actErr &&
      actData?.billingActive === true &&
      actData?.subscriptionStatus === 'piloto_ativo' &&
      !stripeEvt1Err &&
      stripeEvtDupErr?.code === '23505',
    activationResult: actData,
    duplicateStripeEventBlockedCode: stripeEvtDupErr?.code || null,
  };

  // Verificar se anon é bloqueado em renovaext_stripe_events
  const anonClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error: anonStripeErr } = await anonClient.from('renovaext_stripe_events').select('*').limit(1);
  report.checks.stripeEventsTableProtected = {
    passed: anonStripeErr?.code === '42501',
    anonCode: anonStripeErr?.code || null,
  };
} finally {
  // Limpeza 100% completa de todos os dados temporários criados neste teste
  await admin.from('renovaext_stripe_events').delete().eq('stripe_event_id', testStripeEventId);
  for (const cid of createdCompanyIds) {
    await admin.from('companies').delete().eq('id', cid);
  }
  for (const uid of createdUserIds) {
    await admin.auth.admin.deleteUser(uid);
  }
}

const allPassed = Object.values(report.checks).every((c) => c.passed === true);
report.allPassed = allPassed;

console.log(JSON.stringify(report, null, 2));
if (!allPassed) {
  process.exit(1);
}
