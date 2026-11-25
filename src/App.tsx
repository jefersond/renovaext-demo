import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ShieldCheck,
  CalendarClock,
  FileSpreadsheet,
  FileText,
  Settings,
  LogOut,
  PlayCircle,
} from 'lucide-react';
import {
  AuditLogEntry,
  Client,
  Company,
  EquipmentRecord,
  OpportunityHistoryEntry,
  OpportunityStage,
  ParsedImportRow,
  PlanHypothesisId,
  PLAN_HYPOTHESES,
  Proposal,
  ProposalItem,
  ProposalStatus,
  ServiceHistoryEntry,
  UserSession,
} from './types/domain';
import { tenantRepository } from './services/tenantRepository';
import { isSupabaseConfigured, supabase } from './services/supabaseClient';
import {
  fetchAuthenticatedTenantFromSupabase,
  loginWithSupabaseStaging,
  registerAccountInSupabaseStaging,
  requestPasswordResetInSupabase,
  resendConfirmationEmailInSupabase,
  subscribeSupabaseSyncErrors,
} from './services/supabaseStagingSync';
import { buildClientRadarSummaries, computeDashboardMetrics } from './services/radarEngine';
import { AuthAndOnboardingView } from './components/AuthAndOnboardingView';
import { Screen1RadarDashboard } from './components/Screen1RadarDashboard';
import { Screen2ImportAndPortfolio } from './components/Screen2ImportAndPortfolio';
import { Screen3ClientOpportunityProposal } from './components/Screen3ClientOpportunityProposal';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { CommercialLeadModal } from './components/CommercialLeadModal';
import { CommercialLeadIntent } from './services/commercialLeadService';

export type ActiveMainScreen = 'screen1_radar' | 'screen2_import_portfolio' | 'screen3_proposal';

export const App: React.FC = () => {
  const [session, setSession] = useState<UserSession | null>(() =>
    tenantRepository.getActiveSession()
  );
  const [company, setCompany] = useState<Company | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [equipments, setEquipments] = useState<EquipmentRecord[]>([]);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryEntry[]>([]);
  const [opportunityHistory, setOpportunityHistory] = useState<OpportunityHistoryEntry[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [activeScreen, setActiveScreen] = useState<ActiveMainScreen>('screen1_radar');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingConfirmationEmail, setPendingConfirmationEmail] = useState<string | null>(null);
  const [resendFeedback, setResendFeedback] = useState<string | null>(null);
  const [syncErrorBanner, setSyncErrorBanner] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoDemoInitializedRef = useRef(false);
  const [leadModalIntent, setLeadModalIntent] = useState<CommercialLeadIntent | null>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.search.includes('solicitar=piloto')) return 'quero_participar_piloto';
      if (window.location.search.includes('solicitar=demo')) return 'solicitar_demonstracao';
    }
    return null;
  });

  const refreshTenantState = useCallback((currentSession: UserSession | null) => {
    if (!currentSession) {
      setCompany(null);
      setClients([]);
      setEquipments([]);
      setServiceHistory([]);
      setOpportunityHistory([]);
      setProposals([]);
      setAuditLogs([]);
      return;
    }

    try {
      const snapshot = tenantRepository.getTenantSnapshot(currentSession.companyId);
      setCompany(snapshot.company);
      setClients(snapshot.clients);
      setEquipments(snapshot.equipments);
      setServiceHistory(snapshot.serviceHistory);
      setOpportunityHistory(snapshot.opportunityHistory);
      setProposals(snapshot.proposals);
      setAuditLogs(snapshot.auditLogs);
      if (!selectedClientId && snapshot.clients.length > 0) {
        setSelectedClientId(snapshot.clients[0].id);
      }
    } catch {
      tenantRepository.setActiveSession(null);
      setSession(null);
    }
  }, [selectedClientId]);

  useEffect(() => {
    refreshTenantState(session);
  }, [session, refreshTenantState]);

  useEffect(() => {
    return subscribeSupabaseSyncErrors((msg) => setSyncErrorBanner(msg));
  }, []);

  useEffect(() => {
    const isDemoRoute =
      typeof window !== 'undefined' &&
      (window.location.search.includes('demo=1') || window.location.pathname.includes('/demo'));

    if (isDemoRoute && !session && !autoDemoInitializedRef.current) {
      autoDemoInitializedRef.current = true;
      const { session: demoSession } = tenantRepository.ensureFictitiousDemoEnvironment();
      setSession(demoSession);
      setActiveScreen('screen1_radar');
      return;
    }
    if (!isSupabaseConfigured() || import.meta.env.MODE === 'test') return;
    let active = true;
    fetchAuthenticatedTenantFromSupabase()
      .then((remote) => {
        if (!active || !remote) return;
        const { session: hydratedSession } = tenantRepository.hydrateRemoteTenantToLocal(remote);
        setSession(hydratedSession);
        refreshTenantState(hydratedSession);
      })
      .catch(() => {
        // Ignorar silenciosamente caso não haja sessão ativa no Supabase Auth
      });
    return () => {
      active = false;
    };
  }, [refreshTenantState, session]);

  const radarSummaries = useMemo(
    () => buildClientRadarSummaries(clients, equipments),
    [clients, equipments]
  );

  const dashboardMetrics = useMemo(
    () => computeDashboardMetrics(radarSummaries, proposals),
    [radarSummaries, proposals]
  );

  const registeredCompanies = useMemo(
    () => tenantRepository.listRegisteredCompaniesForDemoSwitcher(),
    [session, company, clients.length]
  );

  const handleRegister = (input: {
    companyName: string;
    cnpj: string;
    responsibleName: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    state: string;
    selectedPlanHypothesis: PlanHypothesisId;
  }) => {
    setAuthError(null);
    setResendFeedback(null);

    const isCloudAuthEnabled = isSupabaseConfigured() && import.meta.env.MODE !== 'test';
    if (isCloudAuthEnabled) {
      void registerAccountInSupabaseStaging(input)
        .then((outcome) => {
          if (outcome.pendingEmailConfirmation) {
            setPendingConfirmationEmail(outcome.email);
            return;
          }
          if (outcome.tenant) {
            const { session: remoteSession } = tenantRepository.hydrateRemoteTenantToLocal(
              outcome.tenant,
              input.password
            );
            setSession(remoteSession);
            setActiveScreen('screen2_import_portfolio');
            refreshTenantState(remoteSession);
          }
        })
        .catch((err) => {
          setAuthError(err instanceof Error ? err.message : 'Erro ao criar conta.');
        });
      return;
    }

    try {
      const { session: newSession } = tenantRepository.registerCompanyAccount(input);
      setSession(newSession);
      setActiveScreen('screen2_import_portfolio');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro ao criar conta.');
    }
  };

  const handleResendConfirmation = (emailToResend: string) => {
    setAuthError(null);
    setResendFeedback(null);
    void resendConfirmationEmailInSupabase(emailToResend)
      .then(() => {
        setResendFeedback(
          `Novo link de confirmação enviado para ${emailToResend}. Verifique sua caixa de entrada e spam.`
        );
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : 'Não foi possível reenviar o e-mail de confirmação.'
        );
      });
  };

  const handleRequestPasswordReset = (emailToReset: string) => {
    setAuthError(null);
    setResendFeedback(null);
    void requestPasswordResetInSupabase(emailToReset)
      .then(() => {
        setResendFeedback(
          `Se existir conta para ${emailToReset.trim().toLowerCase()}, enviamos um link de redefinição de senha. Verifique sua caixa de entrada e spam.`
        );
      })
      .catch((err) => {
        setAuthError(
          err instanceof Error ? err.message : 'Não foi possível solicitar a redefinição de senha.'
        );
      });
  };

  const handleLogin = (email: string, password: string) => {
    setAuthError(null);
    setResendFeedback(null);
    try {
      const { session: localSession } = tenantRepository.loginWithEmail(email, password);
      setSession(localSession);
      setActiveScreen('screen1_radar');

      if (isSupabaseConfigured() && import.meta.env.MODE !== 'test') {
        void loginWithSupabaseStaging(email, password)
          .then((remote) => {
            const { session: remoteSession } = tenantRepository.hydrateRemoteTenantToLocal(
              remote,
              password
            );
            setSession(remoteSession);
            refreshTenantState(remoteSession);
          })
          .catch(() => {
            // Mantém sessão local
          });
      }
    } catch (localErr) {
      if (!isSupabaseConfigured() || import.meta.env.MODE === 'test') {
        setAuthError(localErr instanceof Error ? localErr.message : 'Falha no login.');
        return;
      }
      void loginWithSupabaseStaging(email, password)
        .then((remote) => {
          const { session: remoteSession } = tenantRepository.hydrateRemoteTenantToLocal(
            remote,
            password
          );
          setAuthError(null);
          setSession(remoteSession);
          setActiveScreen('screen1_radar');
        })
        .catch((remoteErr) => {
          setAuthError(
            remoteErr instanceof Error ? remoteErr.message : 'E-mail ou senha inválidos.'
          );
        });
    }
  };

  const handleEnterDemo = () => {
    setAuthError(null);
    setPendingConfirmationEmail(null);
    if (supabase) {
      void supabase.auth.signOut();
    }
    const { session: demoSession } = tenantRepository.ensureFictitiousDemoEnvironment();
    setSession(demoSession);
    setActiveScreen('screen1_radar');
  };

  const handleQuickSwitchCompany = (companyId: string) => {
    try {
      setAuthError(null);
      const { session: switched } = tenantRepository.switchDemoCompanySession(companyId);
      setSelectedClientId(null);
      setSession(switched);
      setActiveScreen('screen1_radar');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Erro ao alternar conta.');
    }
  };

  const handleLogout = () => {
    if (supabase) {
      void supabase.auth.signOut();
    }
    tenantRepository.setActiveSession(null);
    setSession(null);
    setSelectedClientId(null);
  };

  const handleCommitImport = (rows: ParsedImportRow[]) => {
    if (!session) throw new Error('Sessão inválida.');
    const result = tenantRepository.commitSpreadsheetImport({
      companyId: session.companyId,
      actorEmail: session.email,
      rows,
    });
    refreshTenantState(session);
    return result;
  };

  const handleSaveClient = (input: {
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
  }) => {
    if (!session) throw new Error('Sessão inválida.');
    const saved = tenantRepository.createOrUpdateClient({
      companyId: session.companyId,
      actorEmail: session.email,
      ...input,
    });
    refreshTenantState(session);
    return saved;
  };

  const handleSaveEquipment = (input: {
    equipmentId?: string;
    clientId: string;
    description: string;
    extinguisherType: string;
    capacity: string | null;
    quantity: number;
    lastServiceDate: string | null;
    nextDueDate: string | null;
    notes: string;
  }) => {
    if (!session) return;
    tenantRepository.addOrUpdateEquipment({
      companyId: session.companyId,
      actorEmail: session.email,
      ...input,
    });
    refreshTenantState(session);
  };

  const handleUpdateStage = (
    clientId: string,
    toStage: OpportunityStage,
    note: string
  ) => {
    if (!session) return;
    tenantRepository.updateOpportunityStage({
      companyId: session.companyId,
      actorEmail: session.email,
      clientId,
      toStage,
      note,
    });
    refreshTenantState(session);
  };

  const handleCreateProposal = (input: {
    clientId: string;
    validityDays: number;
    items: Omit<ProposalItem, 'subtotalBrl'>[];
    notes: string;
  }) => {
    if (!session) throw new Error('Sessão inválida.');
    const created = tenantRepository.createProposal({
      companyId: session.companyId,
      actorEmail: session.email,
      ...input,
    });
    refreshTenantState(session);
    return created;
  };

  const handleUpdateProposalStatus = (proposalId: string, status: ProposalStatus) => {
    if (!session) return;
    tenantRepository.updateProposalStatus({
      companyId: session.companyId,
      actorEmail: session.email,
      proposalId,
      status,
    });
    refreshTenantState(session);
  };

  const handleSaveSettings = (patch: {
    name: string;
    cnpj: string;
    responsibleName: string;
    phone: string;
    city: string;
    state: string;
    selectedPlanHypothesis: PlanHypothesisId;
    defaultProposalValidityDays: number;
    defaultProposalNotes: string;
  }) => {
    if (!session) return;
    tenantRepository.updateCompanySettings(session.companyId, session.email, patch);
    refreshTenantState(session);
  };

  const handleExportCompanyData = () => {
    if (!session || !company) return;
    const jsonStr = tenantRepository.exportCompanyDataJson(
      session.companyId,
      session.email
    );
    refreshTenantState(session);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `renovaext-exportacao-${company.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!session || !company) {
    return (
      <>
        <AuthAndOnboardingView
          onRegister={handleRegister}
          onLogin={handleLogin}
          onRequestPasswordReset={handleRequestPasswordReset}
          onEnterDemo={handleEnterDemo}
          onOpenCommercialLeadModal={(intent) => setLeadModalIntent(intent)}
          registeredCompanies={registeredCompanies}
          onQuickSwitchCompany={handleQuickSwitchCompany}
          errorMessage={authError}
          pendingConfirmationEmail={pendingConfirmationEmail}
          resendFeedback={resendFeedback}
          onResendConfirmation={handleResendConfirmation}
          onDismissConfirmation={() => setPendingConfirmationEmail(null)}
        />
        {leadModalIntent && (
          <CommercialLeadModal
            initialIntent={leadModalIntent}
            sourcePage="/"
            onClose={() => setLeadModalIntent(null)}
          />
        )}
      </>
    );
  }

  const planSpec = PLAN_HYPOTHESES[company.selectedPlanHypothesis];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Barra Superior de Governança e Identificação */}
      <div className="bg-slate-950 text-slate-300 px-4 py-1.5 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {company.isDemoCompany ? (
              <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-mono font-bold">
                AMBIENTE DE DEMONSTRAÇÃO (DADOS FICTÍCIOS)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold">
                CONTA ISOLADA POR EMPRESA (RLS)
              </span>
            )}
            <span>
              Oficina: <strong className="text-white">{company.name}</strong> ({clients.length}/
              {planSpec.maxClients} clientes • {planSpec.name}: R$ {planSpec.monthlyPriceBrl}/mês •{' '}
              {company.isDemoCompany
                ? 'Demonstração gratuita'
                : company.billingActive
                ? 'Assinatura ativa'
                : 'Piloto / Aguardando ativação'}
              )
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLeadModalIntent('solicitar_demonstracao')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold cursor-pointer"
            >
              Solicitar demonstração
            </button>
            <button
              type="button"
              onClick={() => setLeadModalIntent('quero_participar_piloto')}
              className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
            >
              Quero participar do piloto
            </button>
            {!company.isDemoCompany && (
              <button
                type="button"
                onClick={handleEnterDemo}
                className="inline-flex items-center gap-1 text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                Ver Demo Fictícia
              </button>
            )}
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex items-center gap-1 text-slate-300 hover:text-white cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              Configurações & RLS
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              {company.isDemoCompany ? 'Entrar / Criar Conta' : 'Sair'}
            </button>
          </div>
        </div>
      </div>

      {/* Cabeçalho Principal e Navegação das 3 Telas Obrigatórias */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0d5148] flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900">
                  RenovaExt
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                  MVP v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Responsável: {company.responsibleName} ({company.city}/{company.state})
              </p>
            </div>
          </div>

          {/* As 3 Telas Principais definidas na Seção 6 */}
          <nav
            aria-label="Navegação Principal do RenovaExt"
            className="grid grid-cols-3 gap-1.5 sm:flex sm:flex-wrap"
          >
            <button
              type="button"
              onClick={() => setActiveScreen('screen1_radar')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                activeScreen === 'screen1_radar'
                  ? 'bg-[#0d5148] text-white border-[#0d5148] shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <CalendarClock className="w-3.5 h-3.5 shrink-0" />
              <span>Tela 1: Painel de Vencimentos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreen('screen2_import_portfolio')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                activeScreen === 'screen2_import_portfolio'
                  ? 'bg-[#0d5148] text-white border-[#0d5148] shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
              <span>Tela 2: Importação & Carteira ({clients.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveScreen('screen3_proposal')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                activeScreen === 'screen3_proposal'
                  ? 'bg-[#0d5148] text-white border-[#0d5148] shadow-sm'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Tela 3: Oportunidade & Proposta PDF</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">
        {syncErrorBanner && !company.isDemoCompany && (
          <div
            role="alert"
            className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-center justify-between gap-3"
          >
            <span>
              <strong>Atenção na sincronização em nuvem:</strong> {syncErrorBanner}
            </span>
            <button
              type="button"
              onClick={() => setSyncErrorBanner(null)}
              className="underline font-bold cursor-pointer shrink-0"
            >
              Fechar
            </button>
          </div>
        )}
        {activeScreen === 'screen1_radar' && (
          <Screen1RadarDashboard
            metrics={dashboardMetrics}
            summaries={radarSummaries}
            onGoToImport={() => setActiveScreen('screen2_import_portfolio')}
            onSelectClientInPortfolio={(clientId) => {
              setSelectedClientId(clientId);
              setActiveScreen('screen2_import_portfolio');
            }}
            onSelectClientForProposal={(clientId) => {
              setSelectedClientId(clientId);
              setActiveScreen('screen3_proposal');
            }}
          />
        )}

        {activeScreen === 'screen2_import_portfolio' && (
          <Screen2ImportAndPortfolio
            clients={clients}
            equipments={equipments}
            serviceHistory={serviceHistory}
            proposals={proposals}
            selectedPortfolioClientId={selectedClientId}
            onSelectPortfolioClient={setSelectedClientId}
            onCommitImport={handleCommitImport}
            onSaveClient={handleSaveClient}
            onSaveEquipment={handleSaveEquipment}
            onOpenClientInScreen3={(clientId) => {
              setSelectedClientId(clientId);
              setActiveScreen('screen3_proposal');
            }}
            onExportCompanyData={handleExportCompanyData}
            isDemoMode={company.isDemoCompany}
            onOpenCommercialLeadModal={(intent) => setLeadModalIntent(intent)}
          />
        )}

        {activeScreen === 'screen3_proposal' && (
          <Screen3ClientOpportunityProposal
            company={company}
            clients={clients}
            equipments={equipments}
            opportunityHistory={opportunityHistory}
            proposals={proposals}
            selectedClientId={selectedClientId}
            onSelectClient={setSelectedClientId}
            onBackToRadar={() => setActiveScreen('screen1_radar')}
            onUpdateStage={handleUpdateStage}
            onCreateProposal={handleCreateProposal}
            onUpdateProposalStatus={handleUpdateProposalStatus}
          />
        )}
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-slate-200 px-4 py-4 text-xs text-slate-500 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>RenovaExt MVP</strong> — Agenda Comercial de Renovações para Oficinas de Extintores
          </div>
          <div>
            Isolamento Multi-Tenant Ativo • Sem emissão de laudos técnicos • Sem cobrança automática
          </div>
        </div>
      </footer>

      {settingsOpen && (
        <CompanySettingsModal
          company={company}
          auditLogs={auditLogs}
          registeredCompanies={registeredCompanies}
          onClose={() => setSettingsOpen(false)}
          onSaveSettings={handleSaveSettings}
          onExportDataJson={handleExportCompanyData}
          onSwitchCompany={handleQuickSwitchCompany}
        />
      )}

      {leadModalIntent && (
        <CommercialLeadModal
          initialIntent={leadModalIntent}
          initialPlan={company.selectedPlanHypothesis}
          sourcePage={company.isDemoCompany ? '/?demo=1' : '/app'}
          onClose={() => setLeadModalIntent(null)}
        />
      )}
    </div>
  );
};
