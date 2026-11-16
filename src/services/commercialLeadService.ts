import { isSupabaseConfigured, supabase } from './supabaseClient';
import { PlanHypothesisId } from '../types/domain';

export type CommercialLeadIntent =
  | 'solicitar_demonstracao'
  | 'quero_participar_piloto'
  | 'solicitacao_titular_lgpd';

export type CommercialPlanSelection =
  | 'nao_selecionado'
  | 'inicial_49'
  | 'profissional_79'
  | 'avaliacao_acima_500';

export type PortfolioSizeOption =
  | 'ate_50_clientes'
  | '51_a_150_clientes'
  | '151_a_300_clientes'
  | '301_a_500_clientes'
  | 'mais_de_500_clientes';

export const PORTFOLIO_SIZE_LABELS: Record<PortfolioSizeOption, string> = {
  ate_50_clientes: 'Até 50 clientes ativos',
  '51_a_150_clientes': 'De 51 a 150 clientes ativos',
  '151_a_300_clientes': 'De 151 a 300 clientes ativos',
  '301_a_500_clientes': 'De 301 a 500 clientes ativos',
  mais_de_500_clientes: 'Mais de 500 clientes ativos',
};

export interface CommercialLeadInput {
  intentType: CommercialLeadIntent;
  responsibleName: string;
  workshopName: string;
  email: string;
  phone: string;
  portfolioSize: PortfolioSizeOption;
  planInterest: CommercialPlanSelection | PlanHypothesisId;
  notes: string;
  sourcePage: string;
  privacyConsent: boolean;
  honeypot?: string;
  elapsedMs: number;
  isTestSubmission?: boolean;
}

export interface CommercialLeadReceipt {
  id: string;
  protocolCode: string;
  intentType: CommercialLeadIntent;
  responsibleName: string;
  workshopName: string;
  email: string;
  phone: string | null;
  portfolioSize: PortfolioSizeOption;
  planInterest: CommercialPlanSelection;
  suggestedPlan?: string;
  status: string;
  createdAt: string;
}

// Em produção, o navegador armazena APENAS timestamps numéricos de cooldown (zero dados pessoais em localStorage)
const COOLDOWN_TIMESTAMPS_KEY = 'renovaext_lead_cooldown_ts_v2';
const LEGACY_PII_KEY = 'renovaext_commercial_leads_isolated_v1';

// Memória efêmera exclusiva para asserções de testes unitários (Vitest)
let inMemoryTestReceipts: CommercialLeadReceipt[] = [];

export function listLocalCommercialLeadsForAudit(): CommercialLeadReceipt[] {
  return [...inMemoryTestReceipts];
}

export function clearInMemoryCommercialLeadsForTests(): void {
  inMemoryTestReceipts = [];
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(COOLDOWN_TIMESTAMPS_KEY);
    window.localStorage.removeItem(LEGACY_PII_KEY);
  }
}

function isBrowserCooldownActive(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    window.localStorage.removeItem(LEGACY_PII_KEY);
    const raw = window.localStorage.getItem(COOLDOWN_TIMESTAMPS_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return false;
    const recent = list.filter(
      (t) => typeof t === 'number' && Date.now() - t < 5 * 60 * 1000
    );
    return recent.length >= 2;
  } catch {
    return false;
  }
}

function recordBrowserCooldownTimestamp(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const raw = window.localStorage.getItem(COOLDOWN_TIMESTAMPS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const clean = Array.isArray(list)
      ? list.filter((t) => typeof t === 'number' && Date.now() - t < 15 * 60 * 1000)
      : [];
    clean.push(Date.now());
    window.localStorage.setItem(COOLDOWN_TIMESTAMPS_KEY, JSON.stringify(clean.slice(-5)));
  } catch {
    // Ignorar falha de storage
  }
}

export async function submitCommercialLead(
  input: CommercialLeadInput
): Promise<CommercialLeadReceipt> {
  if (input.honeypot && input.honeypot.trim() !== '') {
    throw new Error('SPAM_PROTECTION_HONEYPOT: Submissão automatizada bloqueada.');
  }

  if (input.elapsedMs < 800) {
    throw new Error(
      'Por proteção anti-spam, aguarde alguns segundos ao preencher o formulário antes de enviar.'
    );
  }

  if (!input.privacyConsent) {
    throw new Error(
      'É necessário concordar com a Política de Privacidade para registrar sua solicitação.'
    );
  }

  const cleanResponsible = input.responsibleName.trim();
  const cleanWorkshop = input.workshopName.trim();
  const cleanEmail = input.email.trim().toLowerCase();
  const cleanPhone = input.phone.trim() || null;
  const cleanNotes = input.notes.trim().slice(0, 1000);

  if (cleanResponsible.length < 2) {
    throw new Error('Informe o nome do responsável pela oficina.');
  }

  if (cleanWorkshop.length < 2) {
    throw new Error('Informe o nome da oficina.');
  }

  if (/([<>]|https?:\/\/|www\.)/i.test(cleanResponsible) || /([<>]|https?:\/\/|www\.)/i.test(cleanWorkshop)) {
    throw new Error('Caracteres ou links inválidos nos campos de identificação.');
  }

  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(cleanEmail)) {
    throw new Error('Informe um e-mail comercial válido.');
  }

  if (isBrowserCooldownActive()) {
    throw new Error(
      'Já recebemos uma solicitação recente deste navegador. Aguarde alguns minutos antes de enviar novamente.'
    );
  }

  const effectivePlanToSend: CommercialPlanSelection =
    input.intentType === 'solicitar_demonstracao' ||
    input.intentType === 'solicitacao_titular_lgpd'
      ? 'nao_selecionado'
      : input.portfolioSize === 'mais_de_500_clientes'
      ? 'avaliacao_acima_500'
      : (input.planInterest as CommercialPlanSelection);

  if (isSupabaseConfigured() && supabase && import.meta.env.MODE !== 'test') {
    const { data, error } = await supabase.rpc('submit_commercial_lead', {
      p_intent_type: input.intentType,
      p_responsible_name: cleanResponsible,
      p_workshop_name: cleanWorkshop,
      p_email: cleanEmail,
      p_phone: cleanPhone,
      p_portfolio_size: input.portfolioSize,
      p_plan_interest: effectivePlanToSend,
      p_notes: cleanNotes || null,
      p_source_page: input.sourcePage || '/?demo=1',
      p_privacy_consent: true,
      p_honeypot: input.honeypot || '',
      p_elapsed_ms: Math.max(800, Math.round(input.elapsedMs)),
      p_is_test_submission: Boolean(input.isTestSubmission),
    });

    if (error) {
      throw new Error(error.message || 'Não foi possível registrar sua solicitação no momento.');
    }

    recordBrowserCooldownTimestamp();

    const payload = data as Record<string, unknown>;
    const receipt: CommercialLeadReceipt = {
      id: String(payload.id || crypto.randomUUID()),
      protocolCode: String(payload.protocolCode || 'SOL-CONFIRMADO'),
      intentType: (payload.intentType as CommercialLeadIntent) || input.intentType,
      responsibleName: cleanResponsible,
      workshopName: cleanWorkshop,
      email: cleanEmail,
      phone: cleanPhone,
      portfolioSize: (payload.portfolioSize as PortfolioSizeOption) || input.portfolioSize,
      planInterest:
        (payload.planInterest as CommercialPlanSelection) || effectivePlanToSend,
      suggestedPlan: payload.suggestedPlan ? String(payload.suggestedPlan) : undefined,
      status: String(payload.status || 'recebido_aguardando_contato'),
      createdAt: String(payload.createdAt || new Date().toISOString()),
    };

    return receipt;
  }

  // Fallback determinístico em memória para suíte de testes automatizados (Vitest)
  recordBrowserCooldownTimestamp();
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const fallbackReceipt: CommercialLeadReceipt = {
    id:
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `lead-${Date.now()}`,
    protocolCode: `SOL-${datePart}-${randomSuffix}`,
    intentType: input.intentType,
    responsibleName: cleanResponsible,
    workshopName: cleanWorkshop,
    email: cleanEmail,
    phone: cleanPhone,
    portfolioSize: input.portfolioSize,
    planInterest: effectivePlanToSend,
    status: 'recebido_aguardando_contato',
    createdAt: new Date().toISOString(),
  };

  inMemoryTestReceipts.unshift(fallbackReceipt);
  return fallbackReceipt;
}
