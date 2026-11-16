import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  AuditLogEntry,
  Client,
  Company,
  EquipmentRecord,
  OpportunityHistoryEntry,
  OpportunityStage,
  PlanHypothesisId,
  Proposal,
  ProposalItem,
  ProposalStatus,
  ServiceHistoryEntry,
  UserSession,
} from '../types/domain';

export interface RemoteStagingTenantData {
  userId: string;
  session: UserSession;
  company: Company;
  clients: Client[];
  equipments: EquipmentRecord[];
  serviceHistory: ServiceHistoryEntry[];
  opportunityHistory: OpportunityHistoryEntry[];
  proposals: Proposal[];
  auditLogs: AuditLogEntry[];
}

function mapCompanyRow(row: Record<string, unknown>): Company {
  return {
    id: String(row.id),
    name: String(row.name || ''),
    cnpj: String(row.cnpj || ''),
    responsibleName: String(row.responsible_name || ''),
    email: String(row.email || ''),
    phone: String(row.phone || ''),
    city: String(row.city || 'São Paulo'),
    state: String(row.state || 'SP'),
    selectedPlanHypothesis:
      row.selected_plan_hypothesis === 'inicial_49' ? 'inicial_49' : 'profissional_79',
    billingActive: false,
    defaultProposalValidityDays: Number(row.default_proposal_validity_days) || 15,
    defaultProposalNotes: String(row.default_proposal_notes || ''),
    isDemoCompany: Boolean(row.is_demo_company),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapClientRow(row: Record<string, unknown>): Client {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    name: String(row.name || ''),
    organizationName: String(row.organization_name || row.name || ''),
    contactName: String(row.contact_name || ''),
    contactPhone: String(row.contact_phone || ''),
    contactEmail: String(row.contact_email || ''),
    city: String(row.city || ''),
    notes: String(row.notes || ''),
    needsReview: Boolean(row.needs_review),
    reviewReason: row.review_reason ? String(row.review_reason) : null,
    opportunityStage: (row.opportunity_stage as OpportunityStage) || 'pendente_conferencia',
    isDemo: Boolean(row.is_demo),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function mapEquipmentRow(row: Record<string, unknown>): EquipmentRecord {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    clientId: String(row.client_id),
    description: String(row.description || ''),
    extinguisherType: String(row.extinguisher_type || 'Não informado'),
    capacity: row.capacity ? String(row.capacity) : null,
    quantity: Number(row.quantity) || 1,
    lastServiceDate: row.last_service_date ? String(row.last_service_date) : null,
    nextDueDate: row.next_due_date ? String(row.next_due_date) : null,
    needsReview: Boolean(row.needs_review),
    reviewNotes: row.review_notes ? String(row.review_notes) : null,
    notes: String(row.notes || ''),
    dedupeFingerprint: String(row.dedupe_fingerprint || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || new Date().toISOString()),
  };
}

function isValidUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    val
  );
}

/**
 * Busca todos os registros da empresa autenticada diretamente do banco PostgreSQL
 * no Supabase Staging (filtrados pela política RLS `company_id = current_user_company_id()`).
 */
export async function fetchAuthenticatedTenantFromSupabase(): Promise<RemoteStagingTenantData | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  let companyRow: Record<string, unknown> | null =
    !compErr && companies && companies.length > 0 ? companies[0] : null;

  if (!companyRow) {
    // Caso o usuário tenha acabado de confirmar o e-mail e o registro em `companies`
    // ainda precise ser inicializado a partir dos metadados do `auth.users`:
    const meta = (session.user.user_metadata || {}) as Record<string, unknown>;
    const metaCompanyName = String(meta.company_name || '').trim();
    if (metaCompanyName) {
      await supabase.rpc('bootstrap_company_account', {
        p_company_name: metaCompanyName,
        p_cnpj: String(meta.cnpj || ''),
        p_responsible_name: String(meta.responsible_name || session.user.email || 'Responsável'),
        p_email: String(session.user.email || ''),
        p_phone: String(meta.phone || ''),
        p_city: String(meta.city || 'São Paulo'),
        p_state: String(meta.state || 'SP'),
        p_selected_plan: String(meta.selected_plan_hypothesis || 'profissional_79'),
        p_is_demo: false,
      });
      const retryComp = await supabase.from('companies').select('*').limit(1);
      if (!retryComp.data || retryComp.data.length === 0) {
        return null;
      }
      companyRow = retryComp.data[0];
    } else {
      return null;
    }
  }

  if (!companyRow) {
    return null;
  }

  const company = mapCompanyRow(companyRow);
  if (company.isDemoCompany) {
    return null;
  }

  const [
    clientsRes,
    equipmentsRes,
    srvRes,
    oppHistRes,
    proposalsRes,
    logsRes,
  ] = await Promise.all([
    supabase.from('clients').select('*').order('created_at', { ascending: true }),
    supabase.from('equipments').select('*').order('created_at', { ascending: true }),
    supabase.from('service_history').select('*').order('service_date', { ascending: false }),
    supabase.from('opportunity_history').select('*').order('created_at', { ascending: false }),
    supabase.from('proposals').select('*').order('created_at', { ascending: false }),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50),
  ]);

  return {
    userId: session.user.id,
    session: {
      userId: session.user.id,
      companyId: company.id,
      email: company.email,
      fullName: company.responsibleName,
      role: 'owner',
    },
    company,
    clients: (clientsRes.data || []).map(mapClientRow),
    equipments: (equipmentsRes.data || []).map(mapEquipmentRow),
    serviceHistory: (srvRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      clientId: String(r.client_id),
      serviceDate: String(r.service_date),
      description: String(r.description || ''),
      notes: String(r.notes || ''),
      createdAt: String(r.created_at || new Date().toISOString()),
    })),
    opportunityHistory: (oppHistRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      clientId: String(r.client_id),
      fromStage: (r.from_stage as OpportunityStage) || null,
      toStage: (r.to_stage as OpportunityStage) || 'pendente_conferencia',
      note: String(r.note || ''),
      changedBy: String(r.changed_by || ''),
      createdAt: String(r.created_at || new Date().toISOString()),
    })),
    proposals: (proposalsRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      proposalNumber: String(r.proposal_number),
      companyId: String(r.company_id),
      clientId: String(r.client_id),
      status: (r.status as ProposalStatus) || 'gerada',
      validityDays: Number(r.validity_days) || 15,
      items: Array.isArray(r.items) ? (r.items as ProposalItem[]) : [],
      totalBrl: Number(r.total_brl) || 0,
      notes: String(r.notes || ''),
      createdAt: String(r.created_at || new Date().toISOString()),
      updatedAt: String(r.updated_at || new Date().toISOString()),
    })),
    auditLogs: (logsRes.data || []).map((r: Record<string, unknown>) => ({
      id: String(r.id),
      companyId: String(r.company_id),
      actorEmail: String(r.actor_email || ''),
      action: r.action as AuditLogEntry['action'],
      details: String(r.details || ''),
      createdAt: String(r.created_at || new Date().toISOString()),
    })),
  };
}

export interface SupabaseRegistrationOutcome {
  pendingEmailConfirmation: boolean;
  email: string;
  tenant: RemoteStagingTenantData | null;
}

function getSafeEmailRedirectUrl(): string | undefined {
  if (typeof window === 'undefined' || !window.location) return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}

/**
 * Registra uma conta real no Supabase Auth mantendo a confirmação de e-mail ATIVA por padrão.
 * Envia os metadados da oficina em `options.data` e define `emailRedirectTo` para entrega
 * e retorno corretos do link de confirmação.
 */
export async function registerRealSupabaseAccount(input: {
  companyName: string;
  cnpj?: string;
  responsibleName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  state: string;
  selectedPlanHypothesis: PlanHypothesisId;
  isDemoCompany?: boolean;
}): Promise<SupabaseRegistrationOutcome | null> {
  if (!isSupabaseConfigured() || !supabase || input.isDemoCompany) return null;

  const cleanEmail = input.email.trim().toLowerCase();
  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: cleanEmail,
    password: input.password,
    options: {
      emailRedirectTo: getSafeEmailRedirectUrl(),
      data: {
        company_name: input.companyName.trim(),
        cnpj: (input.cnpj || '').trim(),
        responsible_name: input.responsibleName.trim(),
        phone: input.phone.trim(),
        city: input.city.trim() || 'São Paulo',
        state: (input.state || 'SP').trim().toUpperCase().slice(0, 2),
        selected_plan_hypothesis: input.selectedPlanHypothesis,
      },
    },
  });

  if (signUpErr || !signUpData.user) {
    throw new Error(signUpErr?.message || 'Falha ao registrar usuário no Supabase Auth.');
  }

  // Confirmação de e-mail ativa por padrão: quando `signUpData.session` é null,
  // o Supabase enviou o e-mail de confirmação e aguarda o clique do titular.
  if (!signUpData.session) {
    return {
      pendingEmailConfirmation: true,
      email: cleanEmail,
      tenant: null,
    };
  }

  const { error: rpcErr } = await supabase.rpc('bootstrap_company_account', {
    p_company_name: input.companyName,
    p_cnpj: input.cnpj || '',
    p_responsible_name: input.responsibleName,
    p_email: cleanEmail,
    p_phone: input.phone,
    p_city: input.city,
    p_state: input.state,
    p_selected_plan: input.selectedPlanHypothesis,
    p_is_demo: false,
  });

  if (rpcErr) {
    throw new Error(rpcErr.message || 'Falha ao inicializar empresa no banco PostgreSQL.');
  }

  const tenant = await fetchAuthenticatedTenantFromSupabase();
  return {
    pendingEmailConfirmation: false,
    email: cleanEmail,
    tenant,
  };
}

export async function resendConfirmationEmailInSupabase(email: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Serviço de autenticação não configurado.');
  }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim().toLowerCase(),
    options: {
      emailRedirectTo: getSafeEmailRedirectUrl(),
    },
  });
  if (error) {
    throw new Error(error.message || 'Não foi possível reenviar o e-mail de confirmação.');
  }
}

export async function loginRealSupabaseAccount(
  email: string,
  password: string
): Promise<RemoteStagingTenantData | null> {
  if (!isSupabaseConfigured() || !supabase) return null;

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    if (error.message.toLowerCase().includes('email not confirmed')) {
      throw new Error(
        'Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada (e spam) ou clique em "Reenviar e-mail de confirmação".'
      );
    }
    throw new Error('E-mail ou senha inválidos.');
  }

  return fetchAuthenticatedTenantFromSupabase();
}

export async function registerAccountInSupabaseStaging(
  input: Parameters<typeof registerRealSupabaseAccount>[0]
): Promise<SupabaseRegistrationOutcome> {
  const res = await registerRealSupabaseAccount(input);
  if (!res) throw new Error('Falha ao sincronizar conta com Supabase Staging.');
  return res;
}

export async function loginWithSupabaseStaging(
  email: string,
  password: string
): Promise<RemoteStagingTenantData> {
  const res = await loginRealSupabaseAccount(email, password);
  if (!res) throw new Error('Falha ao autenticar no Supabase Staging.');
  return res;
}

export async function syncClientToSupabase(client: Client): Promise<void> {
  if (
    client.isDemo ||
    !isSupabaseConfigured() ||
    !supabase ||
    !isValidUuid(client.id) ||
    !isValidUuid(client.companyId)
  ) {
    return;
  }
  await supabase.from('clients').upsert({
    id: client.id,
    company_id: client.companyId,
    name: client.name,
    organization_name: client.organizationName,
    contact_name: client.contactName,
    contact_phone: client.contactPhone,
    contact_email: client.contactEmail,
    city: client.city,
    notes: client.notes,
    needs_review: client.needsReview,
    review_reason: client.reviewReason,
    opportunity_stage: client.opportunityStage,
    is_demo: client.isDemo,
    updated_at: client.updatedAt,
  });
}

export async function syncEquipmentToSupabase(eq: EquipmentRecord): Promise<void> {
  if (
    !isSupabaseConfigured() ||
    !supabase ||
    !isValidUuid(eq.id) ||
    !isValidUuid(eq.companyId) ||
    !isValidUuid(eq.clientId)
  ) {
    return;
  }
  await supabase.from('equipments').upsert({
    id: eq.id,
    company_id: eq.companyId,
    client_id: eq.clientId,
    description: eq.description,
    extinguisher_type: eq.extinguisherType,
    capacity: eq.capacity,
    quantity: eq.quantity,
    last_service_date: eq.lastServiceDate,
    next_due_date: eq.nextDueDate,
    needs_review: eq.needsReview,
    review_notes: eq.reviewNotes,
    notes: eq.notes,
    dedupe_fingerprint: eq.dedupeFingerprint,
    updated_at: eq.updatedAt,
  });
}

export async function syncServiceHistoryToSupabase(entry: ServiceHistoryEntry): Promise<void> {
  if (
    !isSupabaseConfigured() ||
    !supabase ||
    !isValidUuid(entry.id) ||
    !isValidUuid(entry.companyId) ||
    !isValidUuid(entry.clientId)
  ) {
    return;
  }
  await supabase.from('service_history').upsert({
    id: entry.id,
    company_id: entry.companyId,
    client_id: entry.clientId,
    service_date: entry.serviceDate,
    description: entry.description,
    notes: entry.notes,
  });
}

export async function syncOpportunityHistoryToSupabase(
  entry: OpportunityHistoryEntry
): Promise<void> {
  if (
    !isSupabaseConfigured() ||
    !supabase ||
    !isValidUuid(entry.id) ||
    !isValidUuid(entry.companyId) ||
    !isValidUuid(entry.clientId)
  ) {
    return;
  }
  await supabase.from('opportunity_history').upsert({
    id: entry.id,
    company_id: entry.companyId,
    client_id: entry.clientId,
    from_stage: entry.fromStage,
    to_stage: entry.toStage,
    note: entry.note,
    changed_by: entry.changedBy,
  });
}

export async function syncProposalToSupabase(proposal: Proposal): Promise<void> {
  if (
    !isSupabaseConfigured() ||
    !supabase ||
    !isValidUuid(proposal.id) ||
    !isValidUuid(proposal.companyId) ||
    !isValidUuid(proposal.clientId)
  ) {
    return;
  }
  await supabase.from('proposals').upsert({
    id: proposal.id,
    company_id: proposal.companyId,
    client_id: proposal.clientId,
    proposal_number: proposal.proposalNumber,
    status: proposal.status,
    validity_days: proposal.validityDays,
    items: proposal.items,
    total_brl: proposal.totalBrl,
    notes: proposal.notes,
    updated_at: proposal.updatedAt,
  });
}

export async function syncCompanySettingsToSupabase(company: Company): Promise<void> {
  if (company.isDemoCompany || !isSupabaseConfigured() || !supabase || !isValidUuid(company.id)) {
    return;
  }
  await supabase
    .from('companies')
    .update({
      name: company.name,
      cnpj: company.cnpj || null,
      responsible_name: company.responsibleName,
      phone: company.phone,
      city: company.city,
      state: company.state,
      selected_plan_hypothesis: company.selectedPlanHypothesis,
      default_proposal_validity_days: company.defaultProposalValidityDays,
      default_proposal_notes: company.defaultProposalNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', company.id);
}

export async function syncAuditLogToSupabase(log: AuditLogEntry): Promise<void> {
  if (!isSupabaseConfigured() || !supabase || !isValidUuid(log.id) || !isValidUuid(log.companyId)) {
    return;
  }
  await supabase.from('audit_logs').insert({
    id: log.id,
    company_id: log.companyId,
    actor_email: log.actorEmail,
    action: log.action,
    details: log.details,
  });
}
