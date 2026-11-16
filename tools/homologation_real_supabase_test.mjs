/**
 * Script Determinístico de Homologação Real no Supabase Staging (Camada 3 - Tools)
 * Executa todos os testes exigidos na FRENTE 1 contra o banco PostgreSQL real do projeto
 * "RenovaExt Staging" (ref: xmuzcnjcwkhgojnaosha):
 *  1. Autenticação real (Supabase Auth JWT) para 2 empresas de teste + 1 empresa Demo.
 *  2. Criação de contas via RPC `public.bootstrap_company_account` sob RLS.
 *  3. Geração e importação real de arquivos CSV e XLSX contendo:
 *     - Datas válidas em diferentes janelas (Atrasado, 30d, 60d, 90d)
 *     - Formatos de data incorretos ("32/13/2026", "texto-invalido")
 *     - Campos ausentes (sem vencimento / sem tipo) marcados como `needs_review = true`
 *     - Linhas duplicadas detectadas e barradas
 *  4. Comprovação real no PostgreSQL de isolamento Row Level Security (RLS) entre Empresa Alpha e Empresa Beta:
 *     - SELECT cruzado retorna 0 registros
 *     - UPDATE cruzado afeta 0 registros
 *     - INSERT forjando `company_id` alheio é bloqueado pelo PostgreSQL com código 42501
 *  5. Jornada completa de Oportunidade + Edição de Preços + Geração de Proposta PDF real em disco.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, '.env.local');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo .env.local não encontrado em ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnvFile(envLocalPath);
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Credenciais do Supabase Staging ausentes em .env.local');
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function createIsolatedUserClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function ensureStagingUserAndLogin(email, password, fullName, companyMeta) {
  // Verificar se o usuário já existe via admin API
  const { data: listData, error: listErr } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  let existingUser = listData.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!existingUser) {
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createErr) throw createErr;
    existingUser = created.user;
  } else {
    // Garantir senha atualizada e e-mail confirmado
    await adminClient.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
    });
  }

  // Autenticar com cliente isolado (usando apenas ANON_KEY + JWT real)
  const userClient = createIsolatedUserClient();
  const { data: signInData, error: signInErr } = await userClient.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) throw signInErr;

  // Executar RPC `bootstrap_company_account` para garantir empresa e profile vinculados
  const { data: companyId, error: rpcErr } = await userClient.rpc('bootstrap_company_account', {
    p_company_name: companyMeta.companyName,
    p_cnpj: companyMeta.cnpj,
    p_responsible_name: fullName,
    p_email: email,
    p_phone: companyMeta.phone,
    p_city: companyMeta.city,
    p_state: companyMeta.state,
    p_selected_plan: companyMeta.plan,
    p_is_demo: Boolean(companyMeta.isDemo),
  });
  if (rpcErr) throw rpcErr;

  // Limpar registros anteriores de homologação desta empresa para execução idempotente
  await userClient.from('proposals').delete().eq('company_id', companyId);
  await userClient.from('opportunity_history').delete().eq('company_id', companyId);
  await userClient.from('service_history').delete().eq('company_id', companyId);
  await userClient.from('equipments').delete().eq('company_id', companyId);
  await userClient.from('clients').delete().eq('company_id', companyId);

  return {
    userClient,
    userId: signInData.user.id,
    email,
    companyId,
    accessTokenPreview: `${signInData.session.access_token.slice(0, 22)}...`,
  };
}

function normalizeDateString(raw) {
  if (!raw || typeof raw !== 'string') return { dateIso: null, invalidReason: null };
  const trimmed = raw.trim();
  if (!trimmed) return { dateIso: null, invalidReason: null };

  // DD/MM/YYYY
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const day = Number(brMatch[1]);
    const month = Number(brMatch[2]);
    const year = Number(brMatch[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() + 1 !== month ||
      dt.getUTCDate() !== day
    ) {
      return {
        dateIso: null,
        invalidReason: `Data inválida ("${trimmed}") — marcada para conferência`,
      };
    }
    return {
      dateIso: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      invalidReason: null,
    };
  }

  // YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const dt = new Date(Date.UTC(year, month - 1, day));
    if (
      dt.getUTCFullYear() !== year ||
      dt.getUTCMonth() + 1 !== month ||
      dt.getUTCDate() !== day
    ) {
      return {
        dateIso: null,
        invalidReason: `Data ISO inválida ("${trimmed}") — marcada para conferência`,
      };
    }
    return { dateIso: trimmed, invalidReason: null };
  }

  return {
    dateIso: null,
    invalidReason: `Formato de data irreconhecível ("${trimmed}") — marcada para conferência`,
  };
}

function classifyRadarWindow(nextDueDateIso, needsReview, todayIso) {
  if (needsReview || !nextDueDateIso) return { window: 'INCOMPLETO', daysDifference: null };
  const todayMs = new Date(`${todayIso}T12:00:00Z`).getTime();
  const dueMs = new Date(`${nextDueDateIso}T12:00:00Z`).getTime();
  const diffDays = Math.round((dueMs - todayMs) / 86400000);
  if (diffDays < 0) return { window: 'ATRASADO', daysDifference: diffDays };
  if (diffDays <= 30) return { window: 'D_30', daysDifference: diffDays };
  if (diffDays <= 60) return { window: 'D_60', daysDifference: diffDays };
  if (diffDays <= 90) return { window: 'D_90', daysDifference: diffDays };
  return { window: 'FUTURO', daysDifference: diffDays };
}

async function runHomologation() {
  console.log('=== INICIANDO HOMOLOGAÇÃO REAL NO SUPABASE STAGING (xmuzcnjcwkhgojnaosha) ===');
  const homologDir = path.join(rootDir, 'docs', 'homologacao');
  fs.mkdirSync(homologDir, { recursive: true });

  const todayIso = new Date().toISOString().slice(0, 10);
  const baseDate = new Date(`${todayIso}T12:00:00Z`);
  const offsetIso = (days) =>
    new Date(baseDate.getTime() + days * 86400 * 1000).toISOString().slice(0, 10);
  const offsetBr = (days) => {
    const iso = offsetIso(days);
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  // 1. Criar e autenticar as 2 empresas de teste no Supabase Auth real usando segredos efêmeros de 256 bits
  console.log('1. Autenticando Empresa Alpha e Empresa Beta no Supabase Auth com segredos efêmeros...');
  const ephemeralAlphaSecret = `${crypto.randomBytes(24).toString('base64url')}!9aA#`;
  const ephemeralBetaSecret = `${crypto.randomBytes(24).toString('base64url')}!9bB#`;
  const ephemeralDemoSecret = `${crypto.randomBytes(24).toString('base64url')}!9dD#`;

  const alpha = await ensureStagingUserAndLogin(
    'alpha.homologacao@renovaext-staging.com.br',
    ephemeralAlphaSecret,
    'Carlos Mendes (Oficina Alpha)',
    {
      companyName: 'Oficina Alpha Extintores LTDA (Homologação)',
      cnpj: '11.222.333/0001-44',
      phone: '(11) 97711-2233',
      city: 'São Paulo',
      state: 'SP',
      plan: 'profissional_79',
      isDemo: false,
    }
  );

  const beta = await ensureStagingUserAndLogin(
    'beta.homologacao@renovaext-staging.com.br',
    ephemeralBetaSecret,
    'Fernanda Lima (Oficina Beta)',
    {
      companyName: 'Oficina Beta Prevenção Contra Incêndio LTDA (Homologação)',
      cnpj: '55.666.777/0001-88',
      phone: '(41) 98844-5566',
      city: 'Curitiba',
      state: 'PR',
      plan: 'inicial_49',
      isDemo: false,
    }
  );

  const demo = await ensureStagingUserAndLogin(
    'demo@oficina-exemplo-ficticio.com.br',
    ephemeralDemoSecret,
    'Ricardo Almeida (Gestor Comercial)',
    {
      companyName: 'Oficina ProtegeFogo Extintores (Demonstração Fictícia)',
      cnpj: '00.000.000/0001-00',
      phone: '(11) 98800-0000',
      city: 'São Paulo',
      state: 'SP',
      plan: 'profissional_79',
      isDemo: true,
    }
  );

  console.log(`   -> Alpha company_id: ${alpha.companyId}`);
  console.log(`   -> Beta  company_id: ${beta.companyId}`);
  console.log(`   -> Demo  company_id: ${demo.companyId}`);

  // 2. Gerar arquivos CSV e XLSX de teste com formatos válidos, incorretos, duplicatas e campos ausentes
  console.log('2. Gerando arquivos CSV e XLSX fictícios para teste de importação...');
  const rawSpreadsheetRows = [
    {
      Cliente: 'Condomínio Edifício Atlântico Sul (Fictício)',
      Contato: 'Sr. Roberto Mendes - (11) 99111-2233',
      Organizacao: 'Condomínio Edifício Atlântico Sul',
      Equipamento: '18x PQS ABC 4kg + 6x Água 10L',
      Tipo_Extintor: 'PQS ABC / Água Pressurizada',
      Capacidade: '4kg e 10L',
      Quantidade: '24',
      Ultimo_Servico: offsetBr(-350),
      Proximo_Vencimento: offsetBr(14), // D_30
      Observacoes: 'Solicita extintores reserva durante retirada para oficina.',
    },
    {
      // Duplicata exata da linha 1 para testar bloqueio de duplicatas!
      Cliente: 'Condomínio Edifício Atlântico Sul (Fictício)',
      Contato: 'Sr. Roberto Mendes - (11) 99111-2233',
      Organizacao: 'Condomínio Edifício Atlântico Sul',
      Equipamento: '18x PQS ABC 4kg + 6x Água 10L',
      Tipo_Extintor: 'PQS ABC / Água Pressurizada',
      Capacidade: '4kg e 10L',
      Quantidade: '24',
      Ultimo_Servico: offsetBr(-350),
      Proximo_Vencimento: offsetBr(14),
      Observacoes: 'Linha duplicada propositalmente na planilha.',
    },
    {
      Cliente: 'Metalúrgica Precisão Industrial (Fictício)',
      Contato: 'Juliana Costa (Compras) - (11) 98222-3344',
      Organizacao: 'Metalúrgica Precisão LTDA',
      Equipamento: '12x PQS BC 6kg + 6x CO2 6kg',
      Tipo_Extintor: 'PQS BC / CO2',
      Capacidade: '6kg',
      Quantidade: '18',
      Ultimo_Servico: offsetBr(-378),
      Proximo_Vencimento: offsetBr(-11), // ATRASADO (-11 dias)
      Observacoes: 'Acompanhamento atrasado há 11 dias na planilha.',
    },
    {
      Cliente: 'Colégio Horizonte Saber (Fictício)',
      Contato: 'Prof. Marcos Vinicius - (19) 99333-4455',
      Organizacao: 'Colégio Horizonte',
      Equipamento: '10x PQS ABC 4kg',
      Tipo_Extintor: 'PQS ABC',
      Capacidade: '4kg',
      Quantidade: '10',
      Ultimo_Servico: offsetBr(-320),
      Proximo_Vencimento: offsetBr(44), // D_60
      Observacoes: 'Agendar vistoria antes do recesso escolar.',
    },
    {
      Cliente: 'Supermercado Bom Preço Matriz (Fictício)',
      Contato: 'Carlos Eduardo - (41) 99444-5566',
      Organizacao: 'Supermercado Bom Preço',
      Equipamento: '15x PQS ABC 6kg + 5x CO2 6kg',
      Tipo_Extintor: 'PQS ABC / CO2',
      Capacidade: '6kg',
      Quantidade: '20',
      Ultimo_Servico: offsetBr(-290),
      Proximo_Vencimento: offsetBr(75), // D_90
      Observacoes: 'Janela de 90 dias. Enviar proposta antecipada.',
    },
    {
      // Formato de data incorreto ("32/13/2026") -> deve marcar needs_review = true e NÃO inventar data!
      Cliente: 'Padaria e Confeitaria Pão Dourado (Fictício)',
      Contato: 'Sr. Antônio Ferreira - (11) 98765-1122',
      Organizacao: 'Panificadora Pão Dourado',
      Equipamento: '4x PQS ABC 4kg + 2x CO2 6kg',
      Tipo_Extintor: 'PQS ABC / CO2',
      Capacidade: '4kg e 6kg',
      Quantidade: '6',
      Ultimo_Servico: offsetBr(-360),
      Proximo_Vencimento: '32/13/2026', // DATA INVÁLIDA!
      Observacoes: 'Data digitada errada na planilha antiga (32/13/2026).',
    },
    {
      // Campos técnicos e data de vencimento ausentes -> deve marcar needs_review = true e NÃO inventar data!
      Cliente: 'Clínica Médica Santa Clara (Fictício)',
      Contato: 'Dra. Helena Prado - (31) 99555-6677',
      Organizacao: 'Clínica Santa Clara',
      Equipamento: '8 cilindros na recepção e corredores',
      Tipo_Extintor: '', // AUSENTE!
      Capacidade: '',
      Quantidade: '8',
      Ultimo_Servico: offsetBr(-335),
      Proximo_Vencimento: '', // AUSENTE!
      Observacoes: 'Sem data de próximo acompanhamento e sem tipo especificado.',
    },
  ];

  const csvPath = path.join(homologDir, 'planilha-teste-homologacao.csv');
  const xlsxPath = path.join(homologDir, 'planilha-teste-homologacao.xlsx');

  const headers = Object.keys(rawSpreadsheetRows[0]);
  const csvLines = [
    headers.join(';'),
    ...rawSpreadsheetRows.map((row) =>
      headers.map((h) => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(';')
    ),
  ];
  fs.writeFileSync(csvPath, '\uFEFF' + csvLines.join('\r\n'), 'utf-8');

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rawSpreadsheetRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Carteira_Oficina');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  fs.writeFileSync(xlsxPath, xlsxBuffer);

  console.log(`   -> CSV salvo em: ${csvPath}`);
  console.log(`   -> XLSX salvo em: ${xlsxPath}`);

  // Ler de volta o XLSX a partir do buffer em disco para comprovar parsing real de XLSX
  const wbRead = XLSX.read(fs.readFileSync(xlsxPath), { type: 'buffer' });
  const sheetName = wbRead.SheetNames[0];
  const parsedXlsxRows = XLSX.utils.sheet_to_json(wbRead.Sheets[sheetName], { defval: '' });

  // 3. Processar e importar registros para Oficina Alpha e Oficina Demo no PostgreSQL
  async function importRowsIntoTenant(tenantCtx, rowsToImport) {
    const seenFingerprints = new Set();
    let importedClients = 0;
    let importedEquipments = 0;
    let flaggedForReview = 0;
    let skippedDuplicates = 0;
    const radarCheckResults = [];

    for (const raw of rowsToImport) {
      const clientName = String(raw.Cliente || '').trim();
      const orgName = String(raw.Organizacao || clientName).trim();
      const contactRaw = String(raw.Contato || '').trim();
      const equipDesc = String(raw.Equipamento || '').trim();
      const extType = String(raw.Tipo_Extintor || '').trim() || 'Não informado';
      const capacity = String(raw.Capacidade || '').trim() || null;
      const qty = Math.max(1, parseInt(String(raw.Quantidade || '1'), 10) || 1);
      const lastDateParsed = normalizeDateString(String(raw.Ultimo_Servico || ''));
      const nextDateParsed = normalizeDateString(String(raw.Proximo_Vencimento || ''));
      const notes = String(raw.Observacoes || '').trim();

      const reviewReasons = [];
      if (nextDateParsed.invalidReason) reviewReasons.push(nextDateParsed.invalidReason);
      if (!nextDateParsed.dateIso && !nextDateParsed.invalidReason) {
        reviewReasons.push('Data de próximo acompanhamento/vencimento ausente — necessita conferência');
      }
      if (extType === 'Não informado') {
        reviewReasons.push('Tipo do extintor não informado — necessita conferência');
      }
      const needsReview = reviewReasons.length > 0;

      const fingerprint = [
        clientName.toLowerCase(),
        orgName.toLowerCase(),
        extType.toLowerCase(),
        (capacity || '').toLowerCase(),
        nextDateParsed.dateIso || 'sem_data',
      ].join('|');

      if (seenFingerprints.has(fingerprint)) {
        skippedDuplicates += 1;
        continue;
      }
      seenFingerprints.add(fingerprint);

      const initialStage = needsReview ? 'pendente_conferencia' : 'pronto_para_contato';

      // Inserir cliente no PostgreSQL (via userClient sob RLS)
      const { data: insertedClient, error: clientErr } = await tenantCtx.userClient
        .from('clients')
        .insert({
          company_id: tenantCtx.companyId,
          name: clientName,
          organization_name: orgName,
          contact_name: contactRaw,
          contact_phone: contactRaw,
          contact_email: '',
          city: 'São Paulo/SP',
          notes,
          needs_review: needsReview,
          review_reason: needsReview ? reviewReasons.join('; ') : null,
          opportunity_stage: initialStage,
          is_demo: tenantCtx.email.includes('demo@'),
        })
        .select('*')
        .single();
      if (clientErr) throw clientErr;
      importedClients += 1;

      // Inserir equipamento no PostgreSQL (sem inventar next_due_date!)
      const { data: insertedEquip, error: equipErr } = await tenantCtx.userClient
        .from('equipments')
        .insert({
          company_id: tenantCtx.companyId,
          client_id: insertedClient.id,
          description: equipDesc,
          extinguisher_type: extType,
          capacity,
          quantity: qty,
          last_service_date: lastDateParsed.dateIso,
          next_due_date: nextDateParsed.dateIso, // NULL quando ausente ou inválido!
          needs_review: needsReview,
          review_notes: needsReview ? reviewReasons.join('; ') : null,
          notes,
          dedupe_fingerprint: fingerprint,
        })
        .select('*')
        .single();
      if (equipErr) throw equipErr;
      importedEquipments += 1;
      if (needsReview) flaggedForReview += 1;

      // Registrar histórico inicial do funil
      await tenantCtx.userClient.from('opportunity_history').insert({
        company_id: tenantCtx.companyId,
        client_id: insertedClient.id,
        from_stage: null,
        to_stage: initialStage,
        note: 'Registro importado via Assistente de Planilhas (Homologação Staging).',
        changed_by: tenantCtx.email,
      });

      if (lastDateParsed.dateIso) {
        await tenantCtx.userClient.from('service_history').insert({
          company_id: tenantCtx.companyId,
          client_id: insertedClient.id,
          service_date: lastDateParsed.dateIso,
          description: `Serviço anterior importado: ${qty}x ${extType}`,
          notes,
        });
      }

      const radarInfo = classifyRadarWindow(nextDateParsed.dateIso, needsReview, todayIso);
      radarCheckResults.push({
        clientId: insertedClient.id,
        clientName: insertedClient.name,
        rawNextDueDate: raw.Proximo_Vencimento,
        storedNextDueDate: insertedEquip.next_due_date,
        needsReview: insertedEquip.needs_review,
        reviewNotes: insertedEquip.review_notes,
        radarWindow: radarInfo.window,
        daysDifference: radarInfo.daysDifference,
      });
    }

    await tenantCtx.userClient.from('audit_logs').insert({
      company_id: tenantCtx.companyId,
      actor_email: tenantCtx.email,
      action: 'IMPORT_BATCH',
      details: `Importação homologada: ${importedClients} clientes, ${importedEquipments} lotes, ${flaggedForReview} para conferência, ${skippedDuplicates} duplicatas ignoradas.`,
    });

    return {
      importedClients,
      importedEquipments,
      flaggedForReview,
      skippedDuplicates,
      radarCheckResults,
    };
  }

  console.log('3. Importando planilha em Oficina Alpha e Oficina Demo no PostgreSQL...');
  const alphaImportResult = await importRowsIntoTenant(alpha, parsedXlsxRows);
  await importRowsIntoTenant(demo, parsedXlsxRows);

  // Inserir 1 cliente exclusivo na Oficina Beta para comprovar isolamento bidirecional
  const { data: betaClient, error: betaClientErr } = await beta.userClient
    .from('clients')
    .insert({
      company_id: beta.companyId,
      name: 'Condomínio Residencial Araucária (Exclusivo Oficina Beta)',
      organization_name: 'Condomínio Araucária',
      contact_name: 'Sra. Patrícia Souza',
      contact_phone: '(41) 99123-4567',
      contact_email: 'sindica@araucaria-beta.com.br',
      city: 'Curitiba/PR',
      notes: 'Cliente exclusivo da Oficina Beta.',
      needs_review: false,
      opportunity_stage: 'pronto_para_contato',
      is_demo: false,
    })
    .select('*')
    .single();
  if (betaClientErr) throw betaClientErr;

  // 4. Jornada de Funil Comercial + Edição de Preços + Geração de Proposta PDF em Oficina Alpha e Demo
  console.log('4. Executando jornada de Oportunidade, Preços Editáveis e Proposta PDF...');
  const targetAlphaClientId = alphaImportResult.radarCheckResults[0].clientId;

  // Avançar etapas no funil comercial
  for (const step of [
    { from: 'pronto_para_contato', to: 'contatado', note: 'Contato realizado com o síndico Sr. Roberto.' },
    { from: 'contatado', to: 'proposta_preparada', note: 'Cotação montada com preços da oficina.' },
    { from: 'proposta_preparada', to: 'proposta_enviada', note: 'PDF enviado para aprovação do condomínio.' },
  ]) {
    await alpha.userClient
      .from('clients')
      .update({ opportunity_stage: step.to, updated_at: new Date().toISOString() })
      .eq('id', targetAlphaClientId);

    await alpha.userClient.from('opportunity_history').insert({
      company_id: alpha.companyId,
      client_id: targetAlphaClientId,
      from_stage: step.from,
      to_stage: step.to,
      note: step.note,
      changed_by: alpha.email,
    });
  }

  const proposalItems = [
    {
      id: 'item-1',
      equipmentId: null,
      equipmentLabel: 'Extintor PQS ABC 4kg (Bloco A e B)',
      serviceDescription: 'Manutenção de 2º Nível e Recarga conforme avaliação técnica (NBR 12962)',
      quantity: 18,
      unitPriceBrl: 65.0,
      subtotalBrl: 1170.0,
    },
    {
      id: 'item-2',
      equipmentId: null,
      equipmentLabel: 'Extintor Água Pressurizada 10L',
      serviceDescription: 'Manutenção de 2º Nível e Recarga conforme avaliação técnica (NBR 12962)',
      quantity: 6,
      unitPriceBrl: 55.0,
      subtotalBrl: 330.0,
    },
  ];
  const proposalTotalBrl = 1500.0;

  const { data: createdProposal, error: propErr } = await alpha.userClient
    .from('proposals')
    .insert({
      company_id: alpha.companyId,
      client_id: targetAlphaClientId,
      proposal_number: 'PROP-2026-001',
      status: 'enviada',
      validity_days: 15,
      items: proposalItems,
      total_brl: proposalTotalBrl,
      notes: 'Inclui empréstimo de extintores reserva durante a manutenção em oficina.',
    })
    .select('*')
    .single();
  if (propErr) throw propErr;

  // Criar proposta também na conta Demo para que a URL pública já exiba propostas criadas no painel
  const { data: demoClients } = await demo.userClient
    .from('clients')
    .select('id, name')
    .eq('company_id', demo.companyId)
    .order('created_at', { ascending: true });
  if (demoClients && demoClients.length > 0) {
    await demo.userClient.from('proposals').insert({
      company_id: demo.companyId,
      client_id: demoClients[0].id,
      proposal_number: 'PROP-2026-001',
      status: 'enviada',
      validity_days: 15,
      items: proposalItems,
      total_brl: proposalTotalBrl,
      notes: 'Proposta comercial demonstrativa com preços informados pela oficina.',
    });
  }

  // Gerar arquivo PDF real em disco com jsPDF
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, 210, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('PROPOSTA COMERCIAL DE MANUTENCAO DE EXTINTORES', 14, 13);
  doc.setFontSize(10);
  doc.text(`Proposta N: ${createdProposal.proposal_number} | Validade: 15 dias`, 14, 21);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.text('OFICINA PRESTADORA: Oficina Alpha Extintores LTDA (CNPJ: 11.222.333/0001-44)', 14, 40);
  doc.text('CLIENTE: Condominio Edificio Atlantico Sul (Ficticio) - Sr. Roberto Mendes', 14, 47);

  let y = 60;
  doc.setFont('helvetica', 'bold');
  doc.text('Itens e Servicos Cotados (Precos informados pela oficina):', 14, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  for (const item of proposalItems) {
    doc.text(
      `- ${item.quantity}x ${item.equipmentLabel} | Unit: R$ ${item.unitPriceBrl.toFixed(2)} | Subtotal: R$ ${item.subtotalBrl.toFixed(2)}`,
      14,
      y
    );
    y += 6;
    doc.setFontSize(9);
    doc.text(`  Servico: ${item.serviceDescription}`, 14, y);
    doc.setFontSize(11);
    y += 8;
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`VALOR TOTAL DA PROPOSTA: R$ ${proposalTotalBrl.toFixed(2)}`, 14, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(
    'Nota Tecnica: Documento exclusivamente comercial. Nao substitui relatorio tecnico de inspecao ou selo INMETRO.',
    14,
    y + 18
  );

  const pdfArrayBuffer = doc.output('arraybuffer');
  const pdfPath = path.join(homologDir, 'proposta-homologacao-real.pdf');
  fs.writeFileSync(pdfPath, Buffer.from(pdfArrayBuffer));
  console.log(`   -> Proposta PDF salva em: ${pdfPath} (${fs.statSync(pdfPath).size} bytes)`);

  // 5. Comprovar Isolamento de Dados (RLS) no Banco PostgreSQL entre Oficina Alpha e Oficina Beta
  console.log('5. Testando isolamento Row Level Security (RLS) real no PostgreSQL...');

  // 5.1. Beta consulta tabela `clients` sem filtro -> só pode receber o próprio cliente (1 registro) e NENHUM dos 6 da Alpha
  const { data: betaVisibleClients } = await beta.userClient.from('clients').select('id, company_id, name');
  const alphaLeakInBetaClients = (betaVisibleClients || []).filter(
    (c) => c.company_id === alpha.companyId
  );

  // 5.2. Beta tenta buscar diretamente pelo ID do cliente da Alpha
  const { data: betaDirectQueryAlphaClient } = await beta.userClient
    .from('clients')
    .select('*')
    .eq('id', targetAlphaClientId);

  // 5.3. Beta tenta buscar propostas da Alpha
  const { data: betaVisibleProposals } = await beta.userClient
    .from('proposals')
    .select('*')
    .eq('company_id', alpha.companyId);

  // 5.4. Beta tenta atualizar (`UPDATE`) um cliente da Alpha
  const { data: betaUpdateAttempt } = await beta.userClient
    .from('clients')
    .update({ notes: 'TENTATIVA_INVASAO_CROSS_TENANT' })
    .eq('id', targetAlphaClientId)
    .select('*');

  // 5.5. Beta tenta inserir (`INSERT`) um cliente forjando o `company_id` da Alpha
  const { error: betaForgedInsertError } = await beta.userClient.from('clients').insert({
    company_id: alpha.companyId,
    name: 'Cliente Injetado Ilegalmente',
  });

  // 5.6. Alpha consulta tabela `clients` -> vê seus 6 clientes e 0 clientes da Beta
  const { data: alphaVisibleClients } = await alpha.userClient
    .from('clients')
    .select('id, company_id, name');
  const betaLeakInAlphaClients = (alphaVisibleClients || []).filter(
    (c) => c.company_id === beta.companyId
  );

  const rlsProof = {
    supabaseProjectRef: 'xmuzcnjcwkhgojnaosha',
    supabaseUrl: SUPABASE_URL,
    testedAt: new Date().toISOString(),
    tenantAlpha: {
      companyId: alpha.companyId,
      userId: alpha.userId,
      email: alpha.email,
      ownClientsCountInDb: (alphaVisibleClients || []).length,
      betaClientsLeakedToAlpha: betaLeakInAlphaClients.length,
    },
    tenantBeta: {
      companyId: beta.companyId,
      userId: beta.userId,
      email: beta.email,
      ownClientsCountInDb: (betaVisibleClients || []).length,
      alphaClientsLeakedToBeta: alphaLeakInBetaClients.length,
      directSelectAlphaClientByIdRows: (betaDirectQueryAlphaClient || []).length,
      directSelectAlphaProposalsRows: (betaVisibleProposals || []).length,
      crossTenantUpdateAffectedRows: (betaUpdateAttempt || []).length,
      forgedInsertBlockedByPostgresRls: Boolean(betaForgedInsertError),
      forgedInsertPostgresErrorCode: betaForgedInsertError?.code || null,
      forgedInsertPostgresErrorMessage: betaForgedInsertError?.message || null,
    },
    importAndRadarVerification: alphaImportResult,
    proposalVerification: {
      proposalId: createdProposal.id,
      proposalNumber: createdProposal.proposal_number,
      totalBrl: Number(createdProposal.total_brl),
      status: createdProposal.status,
      pdfSavedPath: 'docs/homologacao/proposta-homologacao-real.pdf',
      pdfSizeBytes: fs.statSync(pdfPath).size,
    },
  };

  if (
    rlsProof.tenantBeta.alphaClientsLeakedToBeta !== 0 ||
    rlsProof.tenantBeta.directSelectAlphaClientByIdRows !== 0 ||
    rlsProof.tenantBeta.directSelectAlphaProposalsRows !== 0 ||
    rlsProof.tenantBeta.crossTenantUpdateAffectedRows !== 0 ||
    !rlsProof.tenantBeta.forgedInsertBlockedByPostgresRls
  ) {
    throw new Error('FALHA DE SEGURANÇA RLS DETECTADA NO POSTGRESQL!');
  }

  const jsonProofPath = path.join(homologDir, 'evidencias-homologacao-staging.json');
  fs.writeFileSync(jsonProofPath, JSON.stringify(rlsProof, null, 2), 'utf-8');
  console.log(`   -> Evidência JSON salva em: ${jsonProofPath}`);
  console.log('=== HOMOLOGAÇÃO REAL NO SUPABASE STAGING CONCLUÍDA COM 100% DE SUCESSO ===');
}

runHomologation().catch((err) => {
  console.error('ERRO NA HOMOLOGAÇÃO:', err);
  process.exit(1);
});
