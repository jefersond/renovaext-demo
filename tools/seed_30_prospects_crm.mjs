#!/usr/bin/env node
/**
 * Carrega de forma idempotente os 30 potenciais clientes verificados (25/11/2026)
 * exclusivamente na tabela `public.commercial_crm_pipeline` do projeto RenovaExt (`xmuzcnjcwkhgojnaosha`).
 *
 * Regras de governança:
 * - ZERO interferência com a Zuno Propect (banco exclusivo do RenovaExt).
 * - ZERO disparos realizados (todos iniciam em `aguardando_autorizacao_disparo`).
 * - NÃO grava em `public.commercial_leads` (preserva `realLeadsTotal = 0` para leads inbound reais).
 * - Primeiras 5 empresas já recebem rascunho personalizado pronto para revisão e aprovação do CEO.
 */

import fs from 'node:fs';
import path from 'node:path';
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
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('[ERRO] VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes em .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PROSPECTS_30 = [
  // ONDA 1 — SP (11 empresas, HTTP 200 OK) — 5 primeiras com abordagens personalizadas prontas
  {
    lead_code: 'PROSP-RNV-001',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Extinsantos Equipamentos Contra Incêndio',
    city_uf: 'São Paulo/SP',
    website_url: 'https://www.extinsantos.com.br',
    email: 'extinsantos@terra.com.br',
    phone: '(11) 96585-0983',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Oficina tradicional no Ipiranga atendendo capital, Grande SP e litoral; organizar planilha histórica sem trocar o sistema atual.',
    outreach_draft_subject: 'Extinsantos — agenda de renovações de extintores direto da planilha',
    outreach_draft_body:
      'Olá, pessoal da Extinsantos! Tudo bem?\n\nVi a trajetória tradicional de vocês no Ipiranga atendendo capital, Grande SP e litoral com recarga e manutenção de extintores.\n\nDesenvolvemos o RenovaExt para empresas de extintores que querem transformar a planilha atual em uma agenda clara de renovações (atrasados, 30, 60 e 90 dias) e gerar propostas em PDF com os próprios preços — sem abandonar o sistema fiscal atual.\n\nDeixamos uma demonstração aberta com dados 100% fictícios (sem cadastro e sem enviar nenhum dado da sua empresa): https://renovaext.com.br/demo/\n\nEstamos abrindo o piloto de 30 dias sem fidelidade (R$ 49/mês até 150 clientes ou R$ 79/mês até 500 clientes com apoio no mapeamento da 1ª planilha). Faz sentido eu te mostrar em 5 minutos?\n\n(Caso não tenha interesse, basta responder "não tenho interesse" que não enviaremos novos contatos.)',
  },
  {
    lead_code: 'PROSP-RNV-002',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Insight Fire',
    city_uf: 'São Paulo/SP',
    website_url: 'https://www.insightfire.com.br',
    email: 'contato@insightfire.com.br',
    phone: '(11) 94018-4341',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Recarga, teste hidrostático e assessoria AVCB na Zona Sul de SP; radar 30/60/90d para antecipar contatos de condomínios.',
    outreach_draft_subject: 'Insight Fire — radar de renovações 30/60/90 dias para condomínios',
    outreach_draft_body:
      'Olá, equipe da Insight Fire! Tudo bem?\n\nAcompanhei o trabalho de vocês na Zona Sul de SP com recarga de extintores, teste hidrostático e assessoria de AVCB.\n\nCriamos o RenovaExt como um apoio comercial enxuto ao lado do sistema que vocês já usam: você importa sua planilha (CSV ou Excel), o radar separa quem está atrasado ou vence em 30, 60 e 90 dias — marcando linhas sem data para conferência técnica, sem inventar prazos — e gera a proposta em PDF na hora.\n\nVocê pode testar a demonstração com dados 100% fictícios em https://renovaext.com.br/demo/ (sem cadastro).\n\nSe fizer sentido, apresento o piloto de 30 dias sem fidelidade (R$ 49 ou R$ 79/mês) em 5 minutos. Posso te mandar os detalhes?\n\n(Caso prefira não receber novas mensagens, basta responder "não tenho interesse".)',
  },
  {
    lead_code: 'PROSP-RNV-003',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Dig Fire Extintores',
    city_uf: 'São Paulo/SP',
    website_url: 'https://digfire.com.br',
    email: 'digfireextintores@gmail.com',
    phone: '(11) 5513-0396',
    eligible_channel: 'email_ou_telefone',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Atuante desde 2003 em manutenção preventiva, recarga e sinalização; carteira histórica extensa para organizar sem digitar do zero.',
    outreach_draft_subject: 'Dig Fire — organizar a carteira histórica de extintores sem recadastrar do zero',
    outreach_draft_body:
      'Olá, equipe da Dig Fire! Tudo bem?\n\nVi que vocês atuam desde 2003 em São Paulo com manutenção preventiva, recarga de extintores e sinalização.\n\nCom mais de 20 anos de atendimento, é comum ter clientes e datas espalhados em planilhas antigas. O RenovaExt importa seu arquivo Excel ou CSV atual, bloqueia duplicatas, sinaliza cadastros sem data para conferência e monta propostas em PDF com os seus valores.\n\nPara conhecer sem compromisso nem cadastro, deixamos uma demonstração fictícia aberta: https://renovaext.com.br/demo/\n\nO piloto de 30 dias não tem fidelidade (R$ 49/mês até 150 clientes ou R$ 79/mês até 500 clientes). Posso mostrar como funciona em 5 minutos?\n\n(Se não desejar novos contatos, basta responder "não tenho interesse".)',
  },
  {
    lead_code: 'PROSP-RNV-004',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'MDL Extintores',
    city_uf: 'Guarulhos/SP',
    website_url: 'https://www.mdlextintores.com.br',
    email: 'vendas@mdlextintores.com.br',
    phone: '(11) 2382-1911',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: '+14 anos certificada INMETRO atendendo Guarulhos, SP e ABC; agilidade na emissão de propostas PDF e funil em 7 etapas.',
    outreach_draft_subject: 'MDL Extintores — agilidade em renovações e propostas PDF',
    outreach_draft_body:
      'Olá, equipe comercial da MDL Extintores! Tudo bem?\n\nVi a atuação consolidada de vocês em Guarulhos, SP e ABC com manutenção e recarga de extintores certificada INMETRO.\n\nDesenvolvemos o RenovaExt para facilitar a rotina comercial de empresas do setor sem mexer no sistema interno de bancada ou fiscal: vocês importam a carteira em Excel/CSV, visualizam o radar de 30/60/90 dias, acompanham as 7 etapas da negociação e baixam o orçamento em PDF pronto para enviar ao cliente.\n\nDemonstração aberta com dados fictícios (upload real bloqueado): https://renovaext.com.br/demo/\n\nEstamos abrindo o piloto de 30 dias sem fidelidade (R$ 49 ou R$ 79/mês). Faz sentido conversarmos 5 minutos?\n\n(Caso não queira receber novos contatos, basta responder "não tenho interesse".)',
  },
  {
    lead_code: 'PROSP-RNV-005',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Braston Equipamentos Contra Incêndio',
    city_uf: 'Osasco/SP',
    website_url: 'https://brastonextintores.com.br',
    email: 'comercial@brastonextintores.com.br',
    phone: '(11) 97651-2290',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Base industrial e comercial em Osasco; controle de registros incompletos sem inventar datas de CO2 ou teste hidrostático.',
    outreach_draft_subject: 'Braston — acompanhamento comercial de renovações sem inventar datas',
    outreach_draft_body:
      'Olá, pessoal da Braston! Tudo bem?\n\nVi a atuação de vocês em Osasco atendendo empresas e comércios com equipamentos contra incêndio e recarga de extintores.\n\nConstruímos o RenovaExt respeitando a realidade técnica do setor: o sistema não presume recarga anual automática nem inventa prazos — ele organiza sua planilha atual no radar de 30/60/90 dias, separa o que precisa de conferência técnica e gera propostas em PDF com os valores praticados por vocês.\n\nVocê pode testar na hora com dados 100% fictícios em https://renovaext.com.br/demo/\n\nEstamos com piloto de 30 dias sem fidelidade a partir de R$ 49/mês (ou R$ 79/mês até 500 clientes com apoio na 1ª planilha). Posso te enviar mais detalhes?\n\n(Para não receber mais mensagens, basta responder "não tenho interesse".)',
  },
  {
    lead_code: 'PROSP-RNV-006',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Theodoro Extintores',
    city_uf: 'Osasco/SP',
    website_url: 'https://theodoroextintores.com.br',
    email: 'comercial@theodoroextintores.com.br',
    phone: '(11) 94728-5839',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Extintores e EPIs em Osasco; agenda comercial dedicada às renovações de extintores sem mudar o controle de EPI.',
  },
  {
    lead_code: 'PROSP-RNV-007',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Extingrillo Extintores',
    city_uf: 'Campinas/SP',
    website_url: 'https://www.extingrillo.com.br',
    email: 'vendas1@extingrillo.com.br',
    phone: '(19) 3245-0699',
    eligible_channel: 'email_ou_telefone',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Desde 2000 com forte carteira condominial em Campinas; priorizar condomínios com vencimento nos próximos 30 e 60 dias.',
  },
  {
    lead_code: 'PROSP-RNV-008',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Extin-Master Soluções',
    city_uf: 'Campinas/SP',
    website_url: 'https://extinmaster.com.br',
    email: 'vendas1@extinmaster.com.br',
    phone: '(19) 3232-1362',
    eligible_channel: 'email_ou_telefone',
    suggested_plan: 'inicial_49',
    personalization_hook: '+20 anos em manutenção em Campinas; organizar base antiga sem recadastrar manualmente.',
  },
  {
    lead_code: 'PROSP-RNV-009',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Souza Fire',
    city_uf: 'São José dos Campos/SP',
    website_url: 'https://souzafire.com.br',
    email: 'comercial@souzafire.com.br',
    phone: '(12) 99228-7555',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Recarga e prevenção no Vale do Paraíba; envio rápido de cotação PDF para síndicos e compradores via WhatsApp.',
  },
  {
    lead_code: 'PROSP-RNV-010',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Aerotex Extintores',
    city_uf: 'São José dos Campos/SP',
    website_url: 'https://aerotexextintores.com.br',
    email: 'comercial@aerotexextintores.com.br',
    phone: '(12) 98246-4555',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Polo industrial Chácaras Reunidas (SJC); respeito às diferenças técnicas entre PQS/Água e inspeção de CO2.',
  },
  {
    lead_code: 'PROSP-RNV-011',
    source_channel: 'prospeccao_ativa_rodada_1',
    workshop_name: 'Jundiaí Extintores',
    city_uf: 'Jundiaí/SP',
    website_url: 'https://jundiaiextintores.com.br',
    email: 'contato@jundiaiextintores.com.br',
    phone: '(11) 97050-0254',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Condomínios e galpões logísticos em Jundiaí; organização imediata de vencimentos.',
  },

  // ONDA 2 — Litoral/Interior SP e Sul (9 empresas, HTTP 200 OK)
  {
    lead_code: 'PROSP-RNV-012',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'E.D. Extintores',
    city_uf: 'Santos/SP',
    website_url: 'https://edextintores.com.br',
    email: 'ed@edextintores.com.br',
    phone: '(13) 99200-9921',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Alta densidade de condomínios na Baixada Santista; radar semanal evita perder janelas de síndicos.',
  },
  {
    lead_code: 'PROSP-RNV-013',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'ForceFire Extintores',
    city_uf: 'Ribeirão Preto/SP',
    website_url: 'https://forcefire.com.br',
    email: null,
    phone: null,
    eligible_channel: 'formulario_ou_whatsapp_site',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Retirada/entrega e AVCB/CLCB em Ribeirão Preto; funil de 7 etapas para acompanhar propostas em aberto.',
  },
  {
    lead_code: 'PROSP-RNV-014',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'Vicari Extintores',
    city_uf: 'Joinville/SC',
    website_url: 'https://vicariextintores.com.br',
    email: 'vendas@vicarisc.com.br',
    phone: '(47) 99106-0029',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Polo industrial de Joinville; importação Excel/CSV com detecção automática de duplicatas.',
  },
  {
    lead_code: 'PROSP-RNV-015',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'Requinte Soluções Contra Incêndio',
    city_uf: 'Joinville/SC',
    website_url: 'https://requintesci.com.br',
    email: 'requintesci@requintesci.com.br',
    phone: '(47) 99760-0776',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Soluções contra incêndio em SC; padronizar propostas comerciais em PDF com preços próprios.',
  },
  {
    lead_code: 'PROSP-RNV-016',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'PrevenFire Brasil',
    city_uf: 'Florianópolis/SC',
    website_url: 'https://prevenfirebrasil.com.br',
    email: 'prevenfire@prevenfirebrasil.com.br',
    phone: '(48) 3223-0840',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Condomínios e comércios na Grande Florianópolis; radar utilizável no celular ou computador.',
  },
  {
    lead_code: 'PROSP-RNV-017',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'Politec Segurança',
    city_uf: 'Porto Alegre/RS',
    website_url: 'https://politecseguranca.com.br',
    email: 'contato@politecseguranca.com.br',
    phone: null,
    eligible_channel: 'email_ou_whatsapp_site',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Recarga, testes hidrostáticos e PPCI em Porto Alegre; organizar carteira sem ERP caro.',
  },
  {
    lead_code: 'PROSP-RNV-018',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'Medianeira Incêndio',
    city_uf: 'Porto Alegre/RS',
    website_url: 'https://medianeiraextintores.com.br',
    email: null,
    phone: '(51) 99188-2288',
    eligible_channel: 'whatsapp_manual',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Inspeção, recarga e PPCI no RS; piloto de 30 dias sem fidelidade para validar a rotina comercial.',
  },
  {
    lead_code: 'PROSP-RNV-019',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'FHL Extintores',
    city_uf: 'Porto Alegre/RS',
    website_url: 'https://fhlextintores.com.br',
    email: null,
    phone: null,
    eligible_channel: 'whatsapp_site',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Recarga (água, pó ABC/BC, CO2) e reteste em Porto Alegre; gerador de PDF com preços editáveis.',
  },
  {
    lead_code: 'PROSP-RNV-020',
    source_channel: 'prospeccao_ativa_rodada_2',
    workshop_name: 'Maringá Extintores',
    city_uf: 'Maringá/PR',
    website_url: 'https://maringaextintores.com.br',
    email: null,
    phone: null,
    eligible_channel: 'whatsapp_site',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Recarga com selo INMETRO em Maringá; radar 30/60/90d reduz conferência manual de planilhas.',
  },

  // ONDA 3 — RJ, MG e 5 Reservas Técnicas (10 empresas)
  {
    lead_code: 'PROSP-RNV-021',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Atac Fire',
    city_uf: 'Rio de Janeiro/RJ',
    website_url: 'https://atacfire.com.br',
    email: 'contato@atacfire.com.br',
    phone: '(21) 99691-9677',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Oficina homologada INMETRO com contratos preventivos de condomínios no RJ; painel rápido de renovações.',
  },
  {
    lead_code: 'PROSP-RNV-022',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Recel Extintores',
    city_uf: 'Rio de Janeiro/RJ',
    website_url: 'https://recel.com.br',
    email: null,
    phone: '(21) 2590-7759',
    eligible_channel: 'telefone_ou_site',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Engenharia e manutenção de extintores no RJ; ferramenta comercial complementar ao sistema atual.',
  },
  {
    lead_code: 'PROSP-RNV-023',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Fogobras',
    city_uf: 'Rio de Janeiro/RJ',
    website_url: 'https://fogobras.com.br',
    email: null,
    phone: null,
    eligible_channel: 'site_oficial',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Inspeção, recarga e teste hidrostático para condomínios; geração de PDF e controle de propostas em aberto.',
  },
  {
    lead_code: 'PROSP-RNV-024',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Rival do Fogo',
    city_uf: 'Belo Horizonte/MG',
    website_url: 'https://rivaldofogo.com.br',
    email: 'comercial@rivaldofogo.com.br',
    phone: '(31) 99526-7853',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Atendimento tradicional a condomínios em BH e Contagem; organizar carteira sem migrar notas fiscais.',
  },
  {
    lead_code: 'PROSP-RNV-025',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Turci Engenharia',
    city_uf: 'Belo Horizonte/MG',
    website_url: 'https://turciengenharia.com.br',
    email: 'contato@turciengenharia.com.br',
    phone: '(31) 98883-9658',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Segurança contra incêndio e recargas em BH; transparência técnica (não substitui ART/laudo).',
  },
  {
    lead_code: 'PROSP-RNV-026',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Extincamp Extintores',
    city_uf: 'Curitiba/PR',
    website_url: 'https://www.extincamp.com.br',
    email: 'vendas@extincamp.com.br',
    phone: '(41) 98527-5224',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Reserva técnica (WAF 406 em bot): recarga e testes hidrostáticos em Curitiba e RMC.',
  },
  {
    lead_code: 'PROSP-RNV-027',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Extintores Curitiba',
    city_uf: 'Curitiba/PR',
    website_url: 'https://www.extintorescuritiba.com.br',
    email: 'extintorescuritiba@gmail.com',
    phone: '(41) 99253-7931',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Reserva técnica (WAF 406 em bot): venda e recarga de extintores em Curitiba.',
  },
  {
    lead_code: 'PROSP-RNV-028',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Contra Incêndio Comércio e Serviços',
    city_uf: 'Sorocaba/SP',
    website_url: 'https://contraincendio.com.br',
    email: 'contato@contraincendio.com.br',
    phone: '(15) 3233-5959',
    eligible_channel: 'email_ou_telefone',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Reserva técnica (WAF 406 em bot): manutenção e recarga tradicional em Sorocaba/SP.',
  },
  {
    lead_code: 'PROSP-RNV-029',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Extinfran',
    city_uf: 'Belo Horizonte/MG',
    website_url: 'https://extinfran.com.br',
    email: 'vendas@extinfran.com.br',
    phone: '(31) 98416-7740',
    eligible_channel: 'whatsapp_manual_ou_email',
    suggested_plan: 'inicial_49',
    personalization_hook: 'Reserva técnica (WAF 406 em bot): bairro Califórnia (BH), recarga para condomínios e empresas.',
  },
  {
    lead_code: 'PROSP-RNV-030',
    source_channel: 'prospeccao_ativa_rodada_3',
    workshop_name: 'Come Fogo Extintores',
    city_uf: 'Ribeirão Preto/SP',
    website_url: 'https://comefogo.com.br',
    email: null,
    phone: null,
    eligible_channel: 'whatsapp_site',
    suggested_plan: 'profissional_79',
    personalization_hook: 'Reserva técnica (WAF 406 em bot): +40 anos em manutenção preventiva e recarga em Ribeirão Preto.',
  },
];

const rows = PROSPECTS_30.map((p) => ({
  lead_code: p.lead_code,
  source_channel: p.source_channel,
  workshop_name: p.workshop_name,
  city_uf: p.city_uf,
  website_url: p.website_url,
  email: p.email,
  phone: p.phone,
  plan_interest: p.suggested_plan,
  suggested_plan: p.suggested_plan,
  funnel_status: 'aguardando_autorizacao_disparo',
  demo_requested: false,
  payment_confirmed: false,
  is_test_record: false,
  eligible_channel: p.eligible_channel,
  personalization_hook: p.personalization_hook,
  outreach_draft_subject: p.outreach_draft_subject || null,
  outreach_draft_body: p.outreach_draft_body || null,
  opt_out: false,
  notes: `Prospect verificado em 25/11/2026 | ${p.personalization_hook}`,
  updated_at: new Date().toISOString(),
}));

const { data, error } = await supabase
  .from('commercial_crm_pipeline')
  .upsert(rows, { onConflict: 'lead_code' })
  .select('lead_code, workshop_name, source_channel, funnel_status');

if (error) {
  console.error('[ERRO AO CARREGAR 30 PROSPECTS]', error.message);
  process.exit(1);
}

const { count: realInboundCount } = await supabase
  .from('commercial_leads')
  .select('id', { count: 'exact', head: true })
  .eq('is_test_submission', false);

const { count: totalPipelineReal } = await supabase
  .from('commercial_crm_pipeline')
  .select('id', { count: 'exact', head: true })
  .eq('is_test_record', false);

const draftsCount = PROSPECTS_30.filter((p) => Boolean(p.outreach_draft_body)).length;

console.log(
  JSON.stringify(
    {
      ok: true,
      upsertedCount: data?.length || 0,
      totalPipelineReal: totalPipelineReal || 0,
      draftsPreparedCount: draftsCount,
      realInboundLeadsPreservedAt: realInboundCount || 0,
      dispatchedCount: 0,
    },
    null,
    2
  )
);
