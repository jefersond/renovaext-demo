#!/usr/bin/env node
/**
 * CLI Administrativo do Fundador — Ativação de Assinatura / Piloto Pago após confirmação financeira real.
 *
 * Uso (somente após aplicar a migration 20261125000012 e confirmar pagamento real via Pix/Asaas/MP):
 *   node tools/founder_activate_subscription_cli.mjs --email contato@oficina.com.br --plan inicial_49 --status piloto_ativo --days 30 --ref PIX-20261125-001
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

function getArg(flag, fallback = null) {
  const idx = process.argv.indexOf(flag);
  if (idx === -1 || idx + 1 >= process.argv.length) return fallback;
  return process.argv[idx + 1];
}

loadEnvLocal();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('[ERRO] VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY precisam estar configurados em .env.local.');
  process.exit(1);
}

const email = getArg('--email');
const plan = getArg('--plan', 'inicial_49');
const status = getArg('--status', 'piloto_ativo');
const days = Number(getArg('--days', '30')) || 30;
const ref = getArg('--ref', '');

if (!email) {
  console.log('Uso:');
  console.log('  node tools/founder_activate_subscription_cli.mjs --email <email> --plan <inicial_49|profissional_79> --status <piloto_ativo|assinatura_ativa|cancelado> --days <30> --ref <COMPROVANTE>');
  process.exit(0);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase.rpc('founder_activate_company_subscription', {
  p_company_email: email,
  p_plan: plan,
  p_status: status,
  p_duration_days: days,
  p_payment_reference: ref || null,
});

if (error) {
  console.error('[ERRO AO ATIVAR ASSINATURA]', error.message);
  process.exit(1);
}

console.log('[OK] Assinatura atualizada com sucesso:');
console.log(JSON.stringify(data, null, 2));
