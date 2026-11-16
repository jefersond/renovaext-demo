import {
  AuditLogEntry,
  Client,
  Company,
  EquipmentRecord,
  OpportunityHistoryEntry,
  OpportunityStage,
  OPPORTUNITY_STAGE_LABELS,
  ParsedImportRow,
  PlanHypothesisId,
  PLAN_HYPOTHESES,
  Proposal,
  ProposalItem,
  ProposalStatus,
  ServiceHistoryEntry,
  UserSession,
} from '../types/domain';
import { buildDedupeFingerprint } from './spreadsheetImportEngine';
import { calculateProposalTotals } from './pdfProposalGenerator';
import { getTodayIsoLocal } from './radarEngine';
import {
  RemoteStagingTenantData,
  syncAuditLogToSupabase,
  syncClientToSupabase,
  syncCompanySettingsToSupabase,
  syncEquipmentToSupabase,
  syncOpportunityHistoryToSupabase,
  syncProposalToSupabase,
  syncServiceHistoryToSupabase,
} from './supabaseStagingSync';

const STORAGE_KEY = 'renovaext_isolated_db_v1';
const SESSION_KEY = 'renovaext_active_session_v1';

interface StoredCredential {
  userId: string;
  companyId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: 'owner' | 'admin' | 'staff';
}

interface IsolatedDatabaseState {
  companies: Company[];
  credentials: StoredCredential[];
  clients: Client[];
  equipments: EquipmentRecord[];
  serviceHistory: ServiceHistoryEntry[];
  opportunityHistory: OpportunityHistoryEntry[];
  proposals: Proposal[];
  auditLogs: AuditLogEntry[];
}

function createEmptyDb(): IsolatedDatabaseState {
  return {
    companies: [],
    credentials: [],
    clients: [],
    equipments: [],
    serviceHistory: [],
    opportunityHistory: [],
    proposals: [],
    auditLogs: [],
  };
}

function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return `h_${(hash >>> 0).toString(16)}`;
}

/**
 * Repositório Multi-Tenant com isolamento estrito por `companyId` (equivalente ao RLS do PostgreSQL).
 * Garante que uma empresa jamais consiga ler, editar ou exportar registros de outra empresa.
 */
export class TenantRepository {
  private loadDb(): IsolatedDatabaseState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createEmptyDb();
      const parsed = JSON.parse(raw) as Partial<IsolatedDatabaseState>;
      return {
        companies: parsed.companies || [],
        credentials: parsed.credentials || [],
        clients: parsed.clients || [],
        equipments: parsed.equipments || [],
        serviceHistory: parsed.serviceHistory || [],
        opportunityHistory: parsed.opportunityHistory || [],
        proposals: parsed.proposals || [],
        auditLogs: parsed.auditLogs || [],
      };
    } catch {
      return createEmptyDb();
    }
  }

  private saveDb(db: IsolatedDatabaseState): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  public resetDatabaseForTests(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_KEY);
  }

  public getActiveSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as UserSession) : null;
    } catch {
      return null;
    }
  }

  public setActiveSession(session: UserSession | null): void {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  public listRegisteredCompaniesForDemoSwitcher(): Array<{
    companyId: string;
    companyName: string;
    email: string;
    isDemoCompany: boolean;
  }> {
    // Contas de testes internos e outras empresas permanecem estritamente ocultas
    // da experiência de demonstração pública (isolamento multi-tenant).
    return [];
  }

  /**
   * Cadastra uma nova empresa usuária (oficina de extintores) e cria a sessão do responsável.
   */
  public registerCompanyAccount(input: {
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
  }): { session: UserSession; company: Company } {
    const db = this.loadDb();
    const cleanEmail = input.email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Informe um e-mail comercial válido.');
    }
    if (input.password.length < 6) {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    if (db.credentials.some((cred) => cred.email === cleanEmail)) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.');
    }

    const now = new Date().toISOString();
    const companyId = generateId('comp');
    const userId = generateId('usr');

    const company: Company = {
      id: companyId,
      name: input.companyName.trim(),
      cnpj: (input.cnpj || '').trim(),
      responsibleName: input.responsibleName.trim(),
      email: cleanEmail,
      phone: input.phone.trim(),
      city: input.city.trim() || 'São Paulo',
      state: (input.state || 'SP').trim().toUpperCase().slice(0, 2),
      selectedPlanHypothesis: input.selectedPlanHypothesis,
      billingActive: false,
      defaultProposalValidityDays: 15,
      defaultProposalNotes:
        'Disponibilizamos extintores reserva durante a retirada para manutenção em oficina, mediante agendamento prévio. Os serviços seguem a ABNT NBR 12962 e Portaria INMETRO nº 58/2022.',
      isDemoCompany: Boolean(input.isDemoCompany),
      createdAt: now,
    };

    const credential: StoredCredential = {
      userId,
      companyId,
      email: cleanEmail,
      passwordHash: simpleHash(input.password),
      fullName: input.responsibleName.trim(),
      role: 'owner',
    };

    db.companies.push(company);
    db.credentials.push(credential);
    db.auditLogs.unshift({
      id: generateId('log'),
      companyId,
      actorEmail: cleanEmail,
      action: 'COMPANY_CREATED',
      details: `Empresa "${company.name}" cadastrada (Plano em teste: ${company.selectedPlanHypothesis}). Cobrança automática desativada.`,
      createdAt: now,
    });

    this.saveDb(db);

    const session: UserSession = {
      userId,
      companyId,
      email: cleanEmail,
      fullName: credential.fullName,
      role: 'owner',
    };
    this.setActiveSession(session);

    return { session, company };
  }

  public loginWithEmail(email: string, password: string): { session: UserSession; company: Company } {
    const db = this.loadDb();
    const cleanEmail = email.trim().toLowerCase();
    const cred = db.credentials.find(
      (c) => c.email === cleanEmail && c.passwordHash === simpleHash(password)
    );
    if (!cred) {
      throw new Error('E-mail ou senha inválidos.');
    }
    const company = db.companies.find((c) => c.id === cred.companyId);
    if (!company || company.isDemoCompany) {
      throw new Error('E-mail ou senha inválidos.');
    }

    const session: UserSession = {
      userId: cred.userId,
      companyId: cred.companyId,
      email: cred.email,
      fullName: cred.fullName,
      role: cred.role,
    };

    db.auditLogs.unshift({
      id: generateId('log'),
      companyId: company.id,
      actorEmail: cred.email,
      action: 'AUTH_LOGIN',
      details: `Login realizado por ${cred.fullName}.`,
      createdAt: new Date().toISOString(),
    });
    this.saveDb(db);
    this.setActiveSession(session);

    return { session, company };
  }

  public switchDemoCompanySession(companyId: string): { session: UserSession; company: Company } {
    const db = this.loadDb();
    const company = db.companies.find((c) => c.id === companyId);
    const cred = db.credentials.find((c) => c.companyId === companyId);
    if (!company || !cred) {
      throw new Error('Conta solicitada não encontrada.');
    }
    const session: UserSession = {
      userId: cred.userId,
      companyId: cred.companyId,
      email: cred.email,
      fullName: cred.fullName,
      role: cred.role,
    };
    this.setActiveSession(session);
    return { session, company };
  }

  /**
   * Hidrata o estado local a partir dos registros reais do PostgreSQL (Supabase Staging)
   * autenticados sob RLS para o `company_id` da sessão.
   */
  public hydrateRemoteTenantToLocal(
    remote: RemoteStagingTenantData,
    rawPasswordForLocalCache?: string
  ): { session: UserSession; company: Company } {
    const db = this.loadDb();
    const cid = remote.company.id;

    db.companies = [...db.companies.filter((c) => c.id !== cid), remote.company];
    const existingCred = db.credentials.find((c) => c.companyId === cid);
    db.credentials = [
      ...db.credentials.filter((c) => c.companyId !== cid),
      {
        userId: remote.session.userId,
        companyId: cid,
        email: remote.session.email,
        passwordHash: rawPasswordForLocalCache
          ? simpleHash(rawPasswordForLocalCache)
          : existingCred?.passwordHash || simpleHash('supabase-auth-managed'),
        fullName: remote.session.fullName,
        role: remote.session.role,
      },
    ];

    db.clients = [...db.clients.filter((c) => c.companyId !== cid), ...remote.clients];
    db.equipments = [...db.equipments.filter((e) => e.companyId !== cid), ...remote.equipments];
    db.serviceHistory = [
      ...db.serviceHistory.filter((s) => s.companyId !== cid),
      ...remote.serviceHistory,
    ];
    db.opportunityHistory = [
      ...db.opportunityHistory.filter((h) => h.companyId !== cid),
      ...remote.opportunityHistory,
    ];
    db.proposals = [...db.proposals.filter((p) => p.companyId !== cid), ...remote.proposals];
    db.auditLogs = [...db.auditLogs.filter((l) => l.companyId !== cid), ...remote.auditLogs];

    this.saveDb(db);
    this.setActiveSession(remote.session);
    return { session: remote.session, company: remote.company };
  }

  /**
   * Obtém todos os dados isolados exclusivamente para o `companyId` informado (RLS enforcement).
   */
  public getTenantSnapshot(companyId: string): {
    company: Company;
    clients: Client[];
    equipments: EquipmentRecord[];
    serviceHistory: ServiceHistoryEntry[];
    opportunityHistory: OpportunityHistoryEntry[];
    proposals: Proposal[];
    auditLogs: AuditLogEntry[];
  } {
    const db = this.loadDb();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Empresa não encontrada ou sessão inválida.');
    }

    return {
      company,
      clients: db.clients.filter((c) => c.companyId === companyId),
      equipments: db.equipments.filter((e) => e.companyId === companyId),
      serviceHistory: db.serviceHistory.filter((s) => s.companyId === companyId),
      opportunityHistory: db.opportunityHistory.filter((h) => h.companyId === companyId),
      proposals: db.proposals.filter((p) => p.companyId === companyId),
      auditLogs: db.auditLogs.filter((l) => l.companyId === companyId),
    };
  }

  /**
   * Verifica que um cliente pertence estritamente ao `companyId` solicitante.
   * Lança exceção de segurança (RLS) e grava log se outra empresa tentar acessá-lo.
   */
  public getClientByIdIsolated(companyId: string, clientId: string): Client {
    const db = this.loadDb();
    const client = db.clients.find((c) => c.id === clientId);
    if (!client) {
      throw new Error('Cliente não encontrado.');
    }
    if (client.companyId !== companyId) {
      db.auditLogs.unshift({
        id: generateId('log'),
        companyId,
        actorEmail: 'security-monitor',
        action: 'SECURITY_ALERT',
        details: `Tentativa bloqueada de acesso cross-tenant ao cliente ${clientId}.`,
        createdAt: new Date().toISOString(),
      });
      this.saveDb(db);
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Acesso negado a dados de outra empresa.');
    }
    return client;
  }

  public updateCompanySettings(
    companyId: string,
    actorEmail: string,
    patch: Partial<
      Pick<
        Company,
        | 'name'
        | 'cnpj'
        | 'responsibleName'
        | 'phone'
        | 'city'
        | 'state'
        | 'selectedPlanHypothesis'
        | 'defaultProposalValidityDays'
        | 'defaultProposalNotes'
      >
    >
  ): Company {
    const db = this.loadDb();
    const idx = db.companies.findIndex((c) => c.id === companyId);
    if (idx === -1) {
      throw new Error('Empresa não encontrada.');
    }
    const updated: Company = {
      ...db.companies[idx],
      ...patch,
      billingActive: false, // Invariante: jamais ativar cobrança sem autorização
    };
    db.companies[idx] = updated;
    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId,
      actorEmail,
      action: 'COMPANY_UPDATED',
      details: `Configurações da oficina atualizadas (Plano em teste: ${updated.selectedPlanHypothesis}).`,
      createdAt: new Date().toISOString(),
    };
    db.auditLogs.unshift(logEntry);
    this.saveDb(db);
    void syncCompanySettingsToSupabase(updated);
    void syncAuditLogToSupabase(logEntry);
    return updated;
  }

  /**
   * Confirma a importação das linhas revisadas no assistente de planilhas.
   * Respeita o limite de carteira do plano, agrupa equipamentos por cliente e registra auditoria.
   */
  public commitSpreadsheetImport(params: {
    companyId: string;
    actorEmail: string;
    rows: ParsedImportRow[];
    isDemo?: boolean;
  }): {
    importedClientsCount: number;
    importedEquipmentsCount: number;
    flaggedForReviewCount: number;
    skippedDuplicatesCount: number;
  } {
    const { companyId, actorEmail, rows, isDemo = false } = params;
    const db = this.loadDb();
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) {
      throw new Error('Empresa não encontrada.');
    }

    const planSpec = PLAN_HYPOTHESES[company.selectedPlanHypothesis];
    const currentCompanyClients = db.clients.filter((c) => c.companyId === companyId);
    const existingFingerprints = new Set(
      db.equipments.filter((e) => e.companyId === companyId).map((e) => e.dedupeFingerprint)
    );

    const selectedRows = rows.filter((r) => r.selected);
    let importedClientsCount = 0;
    let importedEquipmentsCount = 0;
    let flaggedForReviewCount = 0;
    let skippedDuplicatesCount = rows.filter((r) => !r.selected && r.isDuplicate).length;

    const now = new Date().toISOString();

    for (const row of selectedRows) {
      const fingerprint = buildDedupeFingerprint({
        clientName: row.clientName,
        organizationName: row.organizationName,
        extinguisherType: row.extinguisherType,
        capacity: row.capacity,
        nextDueDate: row.nextDueDate,
        lastServiceDate: row.lastServiceDate,
      });

      if (existingFingerprints.has(fingerprint)) {
        skippedDuplicatesCount += 1;
        continue;
      }

      // Localizar se o cliente já existe na mesma empresa
      const normalizedName = row.clientName.trim().toLowerCase();
      let client = db.clients.find(
        (c) => c.companyId === companyId && c.name.trim().toLowerCase() === normalizedName
      );

      if (!client) {
        if (currentCompanyClients.length + importedClientsCount >= planSpec.maxClients) {
          throw new Error(
            `Limite de carteira do ${planSpec.name} (${planSpec.maxClients} clientes) atingido.`
          );
        }

        const initialStage: OpportunityStage = row.needsReview
          ? 'pendente_conferencia'
          : 'pronto_para_contato';

        client = {
          id: generateId('cli'),
          companyId,
          name: row.clientName.trim(),
          organizationName: (row.organizationName || row.clientName).trim(),
          contactName: row.contactName.trim(),
          contactPhone: row.contactPhone.trim(),
          contactEmail: row.contactEmail.trim(),
          city: row.city.trim() || company.city,
          notes: row.notes.trim(),
          needsReview: row.needsReview,
          reviewReason: row.needsReview ? row.reviewReasons.join('; ') : null,
          opportunityStage: initialStage,
          isDemo,
          createdAt: now,
          updatedAt: now,
        };
        db.clients.push(client);
        importedClientsCount += 1;
        void syncClientToSupabase(client);

        const histEntry: OpportunityHistoryEntry = {
          id: generateId('opphist'),
          companyId,
          clientId: client.id,
          fromStage: null,
          toStage: initialStage,
          note: 'Registro importado via Assistente de Planilhas.',
          changedBy: actorEmail,
          createdAt: now,
        };
        db.opportunityHistory.unshift(histEntry);
        void syncOpportunityHistoryToSupabase(histEntry);
      } else if (row.needsReview && !client.needsReview) {
        client.needsReview = true;
        client.reviewReason = row.reviewReasons.join('; ');
        client.opportunityStage = 'pendente_conferencia';
        client.updatedAt = now;
        void syncClientToSupabase(client);
      }

      const equipment: EquipmentRecord = {
        id: generateId('eq'),
        companyId,
        clientId: client.id,
        description:
          row.equipmentDescription ||
          `${row.quantity}x ${row.extinguisherType}${row.capacity ? ' ' + row.capacity : ''}`,
        extinguisherType: row.extinguisherType || 'Não informado',
        capacity: row.capacity,
        quantity: Math.max(1, row.quantity),
        lastServiceDate: row.lastServiceDate,
        nextDueDate: row.nextDueDate, // NUNCA inventado!
        needsReview: row.needsReview,
        reviewNotes: row.needsReview ? row.reviewReasons.join('; ') : null,
        notes: row.notes,
        dedupeFingerprint: fingerprint,
        createdAt: now,
        updatedAt: now,
      };

      db.equipments.push(equipment);
      existingFingerprints.add(fingerprint);
      importedEquipmentsCount += 1;
      void syncEquipmentToSupabase(equipment);

      if (row.needsReview) {
        flaggedForReviewCount += 1;
      }

      if (row.lastServiceDate) {
        const srvEntry: ServiceHistoryEntry = {
          id: generateId('srv'),
          companyId,
          clientId: client.id,
          serviceDate: row.lastServiceDate,
          description: `Serviço anterior registrado na planilha: ${equipment.quantity}x ${equipment.extinguisherType} ${equipment.capacity || ''}`.trim(),
          notes: row.notes,
          createdAt: now,
        };
        db.serviceHistory.unshift(srvEntry);
        void syncServiceHistoryToSupabase(srvEntry);
      }
    }

    const importLog: AuditLogEntry = {
      id: generateId('log'),
      companyId,
      actorEmail,
      action: 'IMPORT_BATCH',
      details: `Importação concluída: ${importedClientsCount} novos clientes, ${importedEquipmentsCount} lotes de equipamentos, ${flaggedForReviewCount} marcados para conferência, ${skippedDuplicatesCount} duplicatas ignoradas.`,
      createdAt: now,
    };
    db.auditLogs.unshift(importLog);
    void syncAuditLogToSupabase(importLog);

    this.saveDb(db);

    return {
      importedClientsCount,
      importedEquipmentsCount,
      flaggedForReviewCount,
      skippedDuplicatesCount,
    };
  }

  public createOrUpdateClient(params: {
    companyId: string;
    actorEmail: string;
    clientId?: string;
    name: string;
    organizationName: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    city: string;
    notes: string;
    needsReview: boolean;
    reviewReason: string | null;
  }): Client {
    const db = this.loadDb();
    const now = new Date().toISOString();

    if (params.clientId) {
      const idx = db.clients.findIndex((c) => c.id === params.clientId);
      if (idx === -1) throw new Error('Cliente não encontrado.');
      if (db.clients[idx].companyId !== params.companyId) {
        throw new Error('CROSS_TENANT_ACCESS_DENIED: Acesso negado a cliente de outra empresa.');
      }

      const updated: Client = {
        ...db.clients[idx],
        name: params.name.trim(),
        organizationName: params.organizationName.trim() || params.name.trim(),
        contactName: params.contactName.trim(),
        contactPhone: params.contactPhone.trim(),
        contactEmail: params.contactEmail.trim(),
        city: params.city.trim(),
        notes: params.notes.trim(),
        needsReview: params.needsReview,
        reviewReason: params.needsReview ? params.reviewReason : null,
        updatedAt: now,
      };
      db.clients[idx] = updated;

      const logEntry: AuditLogEntry = {
        id: generateId('log'),
        companyId: params.companyId,
        actorEmail: params.actorEmail,
        action: 'CLIENT_UPDATED',
        details: `Ficha do cliente "${updated.name}" atualizada.`,
        createdAt: now,
      };
      db.auditLogs.unshift(logEntry);

      this.saveDb(db);
      void syncClientToSupabase(updated);
      void syncAuditLogToSupabase(logEntry);
      return updated;
    }

    const stage: OpportunityStage = params.needsReview
      ? 'pendente_conferencia'
      : 'pronto_para_contato';

    const created: Client = {
      id: generateId('cli'),
      companyId: params.companyId,
      name: params.name.trim(),
      organizationName: params.organizationName.trim() || params.name.trim(),
      contactName: params.contactName.trim(),
      contactPhone: params.contactPhone.trim(),
      contactEmail: params.contactEmail.trim(),
      city: params.city.trim(),
      notes: params.notes.trim(),
      needsReview: params.needsReview,
      reviewReason: params.needsReview ? params.reviewReason : null,
      opportunityStage: stage,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
    };

    db.clients.push(created);
    const histEntry: OpportunityHistoryEntry = {
      id: generateId('opphist'),
      companyId: params.companyId,
      clientId: created.id,
      fromStage: null,
      toStage: stage,
      note: 'Cliente cadastrado manualmente.',
      changedBy: params.actorEmail,
      createdAt: now,
    };
    db.opportunityHistory.unshift(histEntry);
    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId: params.companyId,
      actorEmail: params.actorEmail,
      action: 'CLIENT_CREATED',
      details: `Cliente "${created.name}" adicionado à carteira.`,
      createdAt: now,
    };
    db.auditLogs.unshift(logEntry);

    this.saveDb(db);
    void syncClientToSupabase(created);
    void syncOpportunityHistoryToSupabase(histEntry);
    void syncAuditLogToSupabase(logEntry);
    return created;
  }

  public addOrUpdateEquipment(params: {
    companyId: string;
    actorEmail: string;
    equipmentId?: string;
    clientId: string;
    description: string;
    extinguisherType: string;
    capacity: string | null;
    quantity: number;
    lastServiceDate: string | null;
    nextDueDate: string | null;
    notes: string;
  }): EquipmentRecord {
    const db = this.loadDb();
    const client = db.clients.find((c) => c.id === params.clientId);
    if (!client || client.companyId !== params.companyId) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Cliente inválido ou de outra empresa.');
    }

    const now = new Date().toISOString();
    const needsReview = !params.nextDueDate || !params.extinguisherType || params.extinguisherType === 'Não informado';
    const reviewNotes = needsReview
      ? 'Necessita conferência: verifique data de próximo acompanhamento e tipo do equipamento.'
      : null;

    const fingerprint = buildDedupeFingerprint({
      clientName: client.name,
      organizationName: client.organizationName,
      extinguisherType: params.extinguisherType,
      capacity: params.capacity,
      nextDueDate: params.nextDueDate,
      lastServiceDate: params.lastServiceDate,
    });

    if (params.equipmentId) {
      const idx = db.equipments.findIndex((e) => e.id === params.equipmentId);
      if (idx === -1 || db.equipments[idx].companyId !== params.companyId) {
        throw new Error('Equipamento não encontrado.');
      }
      const updated: EquipmentRecord = {
        ...db.equipments[idx],
        description: params.description.trim(),
        extinguisherType: params.extinguisherType.trim(),
        capacity: params.capacity ? params.capacity.trim() : null,
        quantity: Math.max(1, params.quantity),
        lastServiceDate: params.lastServiceDate || null,
        nextDueDate: params.nextDueDate || null,
        needsReview,
        reviewNotes,
        notes: params.notes.trim(),
        dedupeFingerprint: `${fingerprint}_${params.equipmentId}`,
        updatedAt: now,
      };
      db.equipments[idx] = updated;

      // Recalcular se o cliente ainda possui pendências de revisão
      const clientEquips = db.equipments.filter(
        (e) => e.companyId === params.companyId && e.clientId === client.id
      );
      const anyNeedsReview = clientEquips.some((e) => e.needsReview || !e.nextDueDate);
      client.needsReview = anyNeedsReview;
      client.reviewReason = anyNeedsReview
        ? 'Existem equipamentos pendentes de conferência técnica/data.'
        : null;
      if (!anyNeedsReview && client.opportunityStage === 'pendente_conferencia') {
        client.opportunityStage = 'pronto_para_contato';
      }
      client.updatedAt = now;

      const logEntry: AuditLogEntry = {
        id: generateId('log'),
        companyId: params.companyId,
        actorEmail: params.actorEmail,
        action: 'CLIENT_REVIEWED',
        details: `Equipamento "${updated.extinguisherType}" do cliente "${client.name}" revisado.`,
        createdAt: now,
      };
      db.auditLogs.unshift(logEntry);

      this.saveDb(db);
      void syncEquipmentToSupabase(updated);
      void syncClientToSupabase(client);
      void syncAuditLogToSupabase(logEntry);
      return updated;
    }

    const created: EquipmentRecord = {
      id: generateId('eq'),
      companyId: params.companyId,
      clientId: client.id,
      description:
        params.description.trim() ||
        `${params.quantity}x ${params.extinguisherType}${params.capacity ? ' ' + params.capacity : ''}`,
      extinguisherType: params.extinguisherType.trim() || 'Não informado',
      capacity: params.capacity ? params.capacity.trim() : null,
      quantity: Math.max(1, params.quantity),
      lastServiceDate: params.lastServiceDate || null,
      nextDueDate: params.nextDueDate || null,
      needsReview,
      reviewNotes,
      notes: params.notes.trim(),
      dedupeFingerprint: `${fingerprint}_${Date.now()}`,
      createdAt: now,
      updatedAt: now,
    };

    db.equipments.push(created);

    if (params.lastServiceDate) {
      const srvEntry: ServiceHistoryEntry = {
        id: generateId('srv'),
        companyId: params.companyId,
        clientId: client.id,
        serviceDate: params.lastServiceDate,
        description: `Registro de ${created.quantity}x ${created.extinguisherType} ${created.capacity || ''}`.trim(),
        notes: params.notes.trim(),
        createdAt: now,
      };
      db.serviceHistory.unshift(srvEntry);
      void syncServiceHistoryToSupabase(srvEntry);
    }

    // Atualizar flag do cliente
    const clientEquips = db.equipments.filter(
      (e) => e.companyId === params.companyId && e.clientId === client.id
    );
    const anyNeedsReview = clientEquips.some((e) => e.needsReview || !e.nextDueDate);
    client.needsReview = anyNeedsReview;
    client.reviewReason = anyNeedsReview ? reviewNotes : null;
    if (!anyNeedsReview && client.opportunityStage === 'pendente_conferencia') {
      client.opportunityStage = 'pronto_para_contato';
    }
    client.updatedAt = now;

    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId: params.companyId,
      actorEmail: params.actorEmail,
      action: 'EQUIPMENT_ADDED',
      details: `Adicionado lote ${created.quantity}x ${created.extinguisherType} para "${client.name}".`,
      createdAt: now,
    };
    db.auditLogs.unshift(logEntry);

    this.saveDb(db);
    void syncEquipmentToSupabase(created);
    void syncClientToSupabase(client);
    void syncAuditLogToSupabase(logEntry);
    return created;
  }

  /**
   * Atualiza a etapa do Funil Comercial do cliente e registra a movimentação no histórico.
   */
  public updateOpportunityStage(params: {
    companyId: string;
    actorEmail: string;
    clientId: string;
    toStage: OpportunityStage;
    note?: string;
  }): Client {
    const db = this.loadDb();
    const clientIdx = db.clients.findIndex((c) => c.id === params.clientId);
    if (clientIdx === -1) {
      throw new Error('Cliente não encontrado.');
    }
    const client = db.clients[clientIdx];
    if (client.companyId !== params.companyId) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Acesso negado a oportunidade de outra empresa.');
    }

    const fromStage = client.opportunityStage;
    const now = new Date().toISOString();
    client.opportunityStage = params.toStage;
    client.updatedAt = now;

    if (params.toStage !== 'pendente_conferencia' && client.needsReview && params.note) {
      client.needsReview = false;
      client.reviewReason = null;
    }

    const histEntry: OpportunityHistoryEntry = {
      id: generateId('opphist'),
      companyId: params.companyId,
      clientId: client.id,
      fromStage,
      toStage: params.toStage,
      note:
        params.note?.trim() ||
        `Etapa alterada de "${OPPORTUNITY_STAGE_LABELS[fromStage]}" para "${OPPORTUNITY_STAGE_LABELS[params.toStage]}".`,
      changedBy: params.actorEmail,
      createdAt: now,
    };
    db.opportunityHistory.unshift(histEntry);

    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId: params.companyId,
      actorEmail: params.actorEmail,
      action: 'STAGE_UPDATED',
      details: `Oportunidade "${client.name}": ${OPPORTUNITY_STAGE_LABELS[fromStage]} -> ${OPPORTUNITY_STAGE_LABELS[params.toStage]}.`,
      createdAt: now,
    };
    db.auditLogs.unshift(logEntry);

    this.saveDb(db);
    void syncClientToSupabase(client);
    void syncOpportunityHistoryToSupabase(histEntry);
    void syncAuditLogToSupabase(logEntry);
    return client;
  }

  /**
   * Cria uma Proposta Comercial garantindo que os preços foram informados pelo usuário.
   */
  public createProposal(params: {
    companyId: string;
    actorEmail: string;
    clientId: string;
    validityDays: number;
    items: Omit<ProposalItem, 'subtotalBrl'>[];
    notes: string;
  }): Proposal {
    const db = this.loadDb();
    const client = db.clients.find((c) => c.id === params.clientId);
    if (!client || client.companyId !== params.companyId) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Cliente inválido ou de outra empresa.');
    }
    if (params.items.length === 0) {
      throw new Error('Selecione pelo menos 1 item/equipamento para montar a proposta.');
    }

    const { itemsWithSubtotal, totalBrl } = calculateProposalTotals(params.items);
    if (totalBrl <= 0) {
      throw new Error(
        'Informe os preços unitários dos serviços antes de gerar a proposta (o sistema não inventa preços automaticamente).'
      );
    }

    const companyProposalsCount = db.proposals.filter(
      (p) => p.companyId === params.companyId
    ).length;
    const year = new Date().getFullYear();
    const proposalNumber = `PROP-${year}-${String(companyProposalsCount + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const proposal: Proposal = {
      id: generateId('prop'),
      proposalNumber,
      companyId: params.companyId,
      clientId: client.id,
      status: 'gerada',
      validityDays: Math.max(1, Math.min(90, params.validityDays || 15)),
      items: itemsWithSubtotal,
      totalBrl,
      notes: params.notes.trim(),
      createdAt: now,
      updatedAt: now,
    };

    db.proposals.unshift(proposal);
    void syncProposalToSupabase(proposal);

    // Avançar etapa do funil para 'proposta_preparada' caso estivesse em etapa anterior
    if (
      ['pendente_conferencia', 'pronto_para_contato', 'contatado'].includes(
        client.opportunityStage
      )
    ) {
      const prevStage = client.opportunityStage;
      client.opportunityStage = 'proposta_preparada';
      client.updatedAt = now;
      const histEntry: OpportunityHistoryEntry = {
        id: generateId('opphist'),
        companyId: params.companyId,
        clientId: client.id,
        fromStage: prevStage,
        toStage: 'proposta_preparada',
        note: `Proposta ${proposalNumber} preparada (${totalBrl.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })}).`,
        changedBy: params.actorEmail,
        createdAt: now,
      };
      db.opportunityHistory.unshift(histEntry);
      void syncClientToSupabase(client);
      void syncOpportunityHistoryToSupabase(histEntry);
    }

    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId: params.companyId,
      actorEmail: params.actorEmail,
      action: 'PROPOSAL_CREATED',
      details: `Proposta ${proposalNumber} criada para "${client.name}" no valor de R$ ${totalBrl.toFixed(2)}.`,
      createdAt: now,
    };
    db.auditLogs.unshift(logEntry);
    void syncAuditLogToSupabase(logEntry);

    this.saveDb(db);
    return proposal;
  }

  public updateProposalStatus(params: {
    companyId: string;
    actorEmail: string;
    proposalId: string;
    status: ProposalStatus;
  }): Proposal {
    const db = this.loadDb();
    const idx = db.proposals.findIndex((p) => p.id === params.proposalId);
    if (idx === -1) throw new Error('Proposta não encontrada.');
    const proposal = db.proposals[idx];
    if (proposal.companyId !== params.companyId) {
      throw new Error('CROSS_TENANT_ACCESS_DENIED: Proposta pertence a outra empresa.');
    }

    const now = new Date().toISOString();
    proposal.status = params.status;
    proposal.updatedAt = now;
    void syncProposalToSupabase(proposal);

    const client = db.clients.find(
      (c) => c.id === proposal.clientId && c.companyId === params.companyId
    );
    if (client) {
      const stageMap: Partial<Record<ProposalStatus, OpportunityStage>> = {
        enviada: 'proposta_enviada',
        aceita: 'aceito',
        perdida: 'perdido',
      };
      const targetStage = stageMap[params.status];
      if (targetStage && client.opportunityStage !== targetStage) {
        const prev = client.opportunityStage;
        client.opportunityStage = targetStage;
        client.updatedAt = now;
        const histEntry: OpportunityHistoryEntry = {
          id: generateId('opphist'),
          companyId: params.companyId,
          clientId: client.id,
          fromStage: prev,
          toStage: targetStage,
          note: `Status da proposta ${proposal.proposalNumber} atualizado para "${params.status}".`,
          changedBy: params.actorEmail,
          createdAt: now,
        };
        db.opportunityHistory.unshift(histEntry);
        void syncClientToSupabase(client);
        void syncOpportunityHistoryToSupabase(histEntry);
      }
    }

    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId: params.companyId,
      actorEmail: params.actorEmail,
      action: 'PROPOSAL_STATUS_UPDATED',
      details: `Proposta ${proposal.proposalNumber} marcada como "${params.status}".`,
      createdAt: now,
    };
    db.auditLogs.unshift(logEntry);
    void syncAuditLogToSupabase(logEntry);

    this.saveDb(db);
    return proposal;
  }

  /**
   * Exporta todos os dados do próprio usuário (Portabilidade e Privacidade LGPD — Seção 5).
   */
  public exportCompanyDataJson(companyId: string, actorEmail: string): string {
    const snapshot = this.getTenantSnapshot(companyId);
    const db = this.loadDb();
    const logEntry: AuditLogEntry = {
      id: generateId('log'),
      companyId,
      actorEmail,
      action: 'DATA_EXPORTED',
      details: 'Exportação completa dos dados da empresa realizada pelo usuário.',
      createdAt: new Date().toISOString(),
    };
    db.auditLogs.unshift(logEntry);
    this.saveDb(db);
    void syncAuditLogToSupabase(logEntry);

    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        product: 'RenovaExt MVP',
        company: snapshot.company,
        clients: snapshot.clients,
        equipments: snapshot.equipments,
        serviceHistory: snapshot.serviceHistory,
        opportunityHistory: snapshot.opportunityHistory,
        proposals: snapshot.proposals,
      },
      null,
      2
    );
  }

  /**
   * Cria ou carrega um ambiente de Demonstração Comercial 100% fictício (Etapa Comercial B)
   * com clientes em todas as janelas do radar (Atrasados, 30d, 60d, 90d e Incompletos).
   */
  public ensureFictitiousDemoEnvironment(referenceDateIso: string = getTodayIsoLocal()): {
    session: UserSession;
    company: Company;
  } {
    const db = this.loadDb();
    const demoEmail = 'demo@oficina-exemplo-ficticio.com.br';
    const existingCred = db.credentials.find((c) => c.email === demoEmail);
    if (existingCred) {
      return this.switchDemoCompanySession(existingCred.companyId);
    }

    const ephemeralDemoSecret = `ephemeral_${generateId('demo_tok')}`;

    const { session, company } = this.registerCompanyAccount({
      companyName: 'Oficina ProtegeFogo Extintores (Demonstração Fictícia)',
      cnpj: '00.000.000/0001-00',
      responsibleName: 'Ricardo Almeida (Gestor Comercial — Fictício)',
      email: demoEmail,
      password: ephemeralDemoSecret,
      phone: '(11) 98800-0000',
      city: 'São Paulo',
      state: 'SP',
      selectedPlanHypothesis: 'profissional_79',
      isDemoCompany: true,
    });

    const baseDate = new Date(`${referenceDateIso}T12:00:00Z`);
    const offsetIso = (days: number) =>
      new Date(baseDate.getTime() + days * 86400 * 1000).toISOString().slice(0, 10);

    const demoRows: ParsedImportRow[] = [
      {
        rowIndex: 1,
        selected: true,
        clientName: 'Condomínio Edifício Atlântico Sul (Fictício)',
        organizationName: 'Condomínio Edifício Atlântico Sul',
        contactName: 'Sr. Roberto Mendes (Síndico)',
        contactPhone: '(11) 99111-2233',
        contactEmail: 'sindico@atlanticosul-demo.com.br',
        city: 'São Paulo/SP',
        equipmentDescription: '18x PQS ABC 4kg + 6x Água Pressurizada 10L',
        extinguisherType: 'PQS ABC / Água Pressurizada',
        capacity: '4kg e 10L',
        quantity: 24,
        lastServiceDate: offsetIso(-350),
        nextDueDate: offsetIso(14),
        notes: 'Solicita colocação de extintores reserva durante a retirada para oficina.',
        needsReview: false,
        reviewReasons: [],
        isDuplicate: false,
        duplicateReason: null,
        dedupeFingerprint: 'demo-1',
      },
      {
        rowIndex: 2,
        selected: true,
        clientName: 'Metalúrgica Precisão Industrial (Fictício)',
        organizationName: 'Metalúrgica Precisão LTDA',
        contactName: 'Juliana Costa (Compras / SESMT)',
        contactPhone: '(11) 98222-3344',
        contactEmail: 'compras@metalprecisao-demo.com.br',
        city: 'Guarulhos/SP',
        equipmentDescription: '12x PQS BC 6kg + 6x CO2 6kg',
        extinguisherType: 'PQS BC / CO2',
        capacity: '6kg',
        quantity: 18,
        lastServiceDate: offsetIso(-378),
        nextDueDate: offsetIso(-11),
        notes: 'Acompanhamento atrasado há 11 dias na planilha antiga. Prioridade de contato.',
        needsReview: false,
        reviewReasons: [],
        isDuplicate: false,
        duplicateReason: null,
        dedupeFingerprint: 'demo-2',
      },
      {
        rowIndex: 3,
        selected: true,
        clientName: 'Colégio Horizonte Saber (Fictício)',
        organizationName: 'Colégio Horizonte',
        contactName: 'Prof. Marcos Vinicius (Diretor Administrativo)',
        contactPhone: '(19) 99333-4455',
        contactEmail: 'adm@colegiohorizonte-demo.com.br',
        city: 'Campinas/SP',
        equipmentDescription: '10x PQS ABC 4kg + 4x Água 10L',
        extinguisherType: 'PQS ABC',
        capacity: '4kg',
        quantity: 14,
        lastServiceDate: offsetIso(-320),
        nextDueDate: offsetIso(44),
        notes: 'Janela de 60 dias. Agendar vistoria antes das férias escolares.',
        needsReview: false,
        reviewReasons: [],
        isDuplicate: false,
        duplicateReason: null,
        dedupeFingerprint: 'demo-3',
      },
      {
        rowIndex: 4,
        selected: true,
        clientName: 'Supermercado Bom Preço Matriz (Fictício)',
        organizationName: 'Supermercado Bom Preço',
        contactName: 'Carlos Eduardo (Gerente Geral)',
        contactPhone: '(41) 99444-5566',
        contactEmail: 'gerencia@bompreco-demo.com.br',
        city: 'Curitiba/PR',
        equipmentDescription: '15x PQS ABC 6kg + 5x CO2 6kg',
        extinguisherType: 'PQS ABC / CO2',
        capacity: '6kg',
        quantity: 20,
        lastServiceDate: offsetIso(-290),
        nextDueDate: offsetIso(75),
        notes: 'Janela de 90 dias. Cliente costuma pedir proposta com 60 dias de antecedência.',
        needsReview: false,
        reviewReasons: [],
        isDuplicate: false,
        duplicateReason: null,
        dedupeFingerprint: 'demo-4',
      },
      {
        rowIndex: 5,
        selected: true,
        clientName: 'Clínica Médica Santa Clara (Fictício)',
        organizationName: 'Clínica Santa Clara',
        contactName: 'Dra. Helena Prado',
        contactPhone: '(31) 99555-6677',
        contactEmail: 'administracao@santaclara-demo.com.br',
        city: 'Belo Horizonte/MG',
        equipmentDescription: '8 cilindros (tipo e vencimento ausentes na planilha antiga)',
        extinguisherType: 'Não informado',
        capacity: null,
        quantity: 8,
        lastServiceDate: offsetIso(-335),
        nextDueDate: null,
        notes: 'Linha importada sem data de próximo acompanhamento — marcada para conferência.',
        needsReview: true,
        reviewReasons: [
          'Data de próximo acompanhamento/vencimento não informada — necessita conferência',
          'Tipo de extintor não especificado — necessita conferência',
        ],
        isDuplicate: false,
        duplicateReason: null,
        dedupeFingerprint: 'demo-5',
      },
    ];

    this.commitSpreadsheetImport({
      companyId: company.id,
      actorEmail: session.email,
      rows: demoRows,
      isDemo: true,
    });

    return { session, company };
  }
}

export const tenantRepository = new TenantRepository();
