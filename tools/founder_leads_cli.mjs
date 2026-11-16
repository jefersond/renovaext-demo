/**
 * Utilitário Local de Consulta e Atualização de Interessados (Camada 3 - Tools)
 * Permite ao fundador consultar no terminal (ou sincronizar o arquivo local do CRM)
 * as solicitações reais de clientes sem misturar registros técnicos de teste.
 *
 * Uso:
 *   node tools/founder_leads_cli.mjs               # Lista interessados reais e indicadores
 *   node tools/founder_leads_cli.mjs --all         # Inclui registros técnicos de teste
 *   node tools/founder_leads_cli.mjs --status <PROTOCOLO> <NOVO_STATUS>
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, '.env.local');

function loadEnvFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
  }
  return env;
}

async function main() {
  const env = loadEnvFile(envLocalPath);
  const client = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const args = process.argv.slice(2);
  const includeTests = args.includes('--all');
  const statusIdx = args.indexOf('--status');

  if (statusIdx !== -1 && args[statusIdx + 1] && args[statusIdx + 2]) {
    const protocolCode = args[statusIdx + 1].trim().toUpperCase();
    const newStatus = args[statusIdx + 2].trim();
    const { data, error } = await client
      .from('commercial_leads')
      .update({ crm_status: newStatus, updated_at: new Date().toISOString() })
      .eq('protocol_code', protocolCode)
      .select('protocol_code, workshop_name, crm_status, updated_at')
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar protocolo ${protocolCode}: ${error.message}`);
    }
    console.log(JSON.stringify({ updated: data }, null, 2));
    return;
  }

  let query = client
    .from('commercial_leads')
    .select(
      'protocol_code, created_at, workshop_name, responsible_name, email, phone, portfolio_size, plan_interest, suggested_plan, intent_type, crm_status, is_test_submission, notes'
    )
    .order('created_at', { ascending: false });

  if (!includeTests) {
    query = query.eq('is_test_submission', false);
  }

  const { data: leads, error } = await query;
  if (error) throw error;

  console.log(
    JSON.stringify(
      {
        filter: includeTests ? 'TODOS (INCLUINDO TESTES TÉCNICOS)' : 'APENAS CLIENTES REAIS',
        count: (leads || []).length,
        leads: leads || [],
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
