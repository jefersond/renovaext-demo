import React, { useState } from 'react';
import {
  ShieldCheck,
  FileSpreadsheet,
  CalendarClock,
  FileText,
  PlayCircle,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PLAN_HYPOTHESES, PlanHypothesisId } from '../types/domain';
import { CommercialLeadIntent } from '../services/commercialLeadService';

interface AuthAndOnboardingViewProps {
  onRegister: (input: {
    companyName: string;
    cnpj: string;
    responsibleName: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    state: string;
    selectedPlanHypothesis: PlanHypothesisId;
  }) => void;
  onLogin: (email: string, password: string) => void;
  onRequestPasswordReset?: (email: string) => void;
  onEnterDemo: () => void;
  onOpenCommercialLeadModal?: (intent: CommercialLeadIntent) => void;
  registeredCompanies: Array<{
    companyId: string;
    companyName: string;
    email: string;
    isDemoCompany: boolean;
  }>;
  onQuickSwitchCompany: (companyId: string) => void;
  errorMessage: string | null;
  pendingConfirmationEmail?: string | null;
  resendFeedback?: string | null;
  onResendConfirmation?: (email: string) => void;
  onDismissConfirmation?: () => void;
}

export const AuthAndOnboardingView: React.FC<AuthAndOnboardingViewProps> = ({
  onRegister,
  onLogin,
  onRequestPasswordReset,
  onEnterDemo,
  onOpenCommercialLeadModal,
  registeredCompanies,
  onQuickSwitchCompany,
  errorMessage,
  pendingConfirmationEmail,
  resendFeedback,
  onResendConfirmation,
  onDismissConfirmation,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [responsibleName, setResponsibleName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateUf, setStateUf] = useState('SP');
  const [selectedPlan, setSelectedPlan] = useState<PlanHypothesisId>('profissional_79');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRegister({
      companyName,
      cnpj,
      responsibleName,
      email,
      password,
      phone,
      city,
      state: stateUf,
      selectedPlanHypothesis: selectedPlan,
    });
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(loginEmail, loginPassword);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Transparência Comercial e Segurança */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-300">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 font-semibold">
              ÁREA DA OFICINA • RLS ATIVO
            </span>
            <span>
              Ambiente isolado por empresa • Sem cobrança automática no cadastro • Sem disparos externos
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {onOpenCommercialLeadModal && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenCommercialLeadModal('solicitar_demonstracao')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold cursor-pointer"
                >
                  Solicitar demonstração
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCommercialLeadModal('quero_participar_piloto')}
                  className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer"
                >
                  Quero participar do piloto
                </button>
              </>
            )}
            <a
              href="/"
              className="text-slate-300 hover:text-white font-semibold underline"
            >
              ← Voltar ao site oficial
            </a>
            <a
              href="/proposta-piloto.html"
              className="text-slate-300 hover:text-white font-semibold underline"
            >
              Proposta de Piloto (30 Dias)
            </a>
            <button
              type="button"
              onClick={onEnterDemo}
              className="text-red-400 hover:text-red-300 font-semibold underline cursor-pointer"
            >
              Abrir Demonstração com Dados Fictícios →
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 lg:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Coluna Esquerda: Posicionamento e Proposta de Valor */}
        <div className="lg:col-span-6 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-red-500" />
            <span>Para empresas de inspeção, manutenção e recarga de extintores</span>
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Transforme sua carteira de manutenção de extintores em uma agenda organizada de renovações, sem abandonar seu sistema atual.
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Você importa sua planilha atual (.CSV ou .XLSX) e consegue visualizar quais condomínios, lojas, escolas e empresas devem entrar na sua agenda de acompanhamento comercial — com propostas em PDF prontas para cotar.
            </p>
          </div>

          {/* 3 Pilares Práticos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <FileSpreadsheet className="w-5 h-5 text-red-500 mb-2" />
              <h3 className="font-bold text-sm text-white">1. Importe sua Planilha</h3>
              <p className="text-xs text-slate-400 mt-1">
                Associe as colunas da sua planilha atual, revise pendências e evite duplicatas sem digitar do zero.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <CalendarClock className="w-5 h-5 text-red-500 mb-2" />
              <h3 className="font-bold text-sm text-white">2. Radar 30 / 60 / 90d</h3>
              <p className="text-xs text-slate-400 mt-1">
                Visualize acompanhamentos atrasados, vencimentos próximos e registros que necessitam conferência.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
              <FileText className="w-5 h-5 text-red-500 mb-2" />
              <h3 className="font-bold text-sm text-white">3. Propostas em PDF</h3>
              <p className="text-xs text-slate-400 mt-1">
                Monte cotações com seus próprios preços, gere o PDF para download e acompanhe o funil comercial.
              </p>
            </div>
          </div>

          {/* Botão de Demonstração Imediata */}
          <div className="p-5 rounded-xl bg-gradient-to-r from-red-950/60 to-slate-900 border border-red-800/50 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-red-300 font-semibold">
                  DEMONSTRAÇÃO COMERCIAL IMEDIATA
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Quer testar o sistema agora com uma oficina fictícia pronta?
                </h2>
                <p className="text-xs text-slate-300 mt-1">
                  Carrega instantaneamente 5 clientes fictícios em diferentes janelas de vencimento para você testar o radar, importar planilhas e gerar PDFs.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={onEnterDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors shadow-lg shadow-red-950/50 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4" />
                Acessar Demonstração Navegável (Dados Fictícios)
              </button>
              {onOpenCommercialLeadModal && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenCommercialLeadModal('solicitar_demonstracao')}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    Solicitar demonstração
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenCommercialLeadModal('quero_participar_piloto')}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm cursor-pointer"
                  >
                    Quero participar do piloto
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Aviso de Responsabilidade Técnica */}
          <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200">Transparência Técnica:</strong> O RenovaExt organiza o acompanhamento comercial com base nos registros da oficina. Os requisitos de inspeção e manutenção variam conforme o equipamento, normas técnicas (ABNT NBR 12962 / Portaria INMETRO nº 58/2022) e condições de uso. O aplicativo não emite laudos técnicos nem substitui seu sistema fiscal.
            </div>
          </div>

          {registeredCompanies.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Contas registradas neste ambiente local (Troca rápida para teste de isolamento RLS):
              </div>
              <div className="flex flex-wrap gap-2">
                {registeredCompanies.map((comp) => (
                  <button
                    key={comp.companyId}
                    type="button"
                    onClick={() => onQuickSwitchCompany(comp.companyId)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 cursor-pointer"
                  >
                    {comp.companyName} ({comp.email})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Coluna Direita: Formulário de Cadastro / Login */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex border-b border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => setMode('register')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'register'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Criar Conta da Oficina
            </button>
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                mode === 'login'
                  ? 'border-red-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Entrar na Minha Conta
            </button>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mb-4 p-3 rounded-lg bg-red-950/80 border border-red-700 text-xs text-red-200"
            >
              {errorMessage}
            </div>
          )}

          {resendFeedback && (
            <div
              role="status"
              className="mb-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-700 text-xs text-emerald-200"
            >
              {resendFeedback}
            </div>
          )}

          {pendingConfirmationEmail ? (
            <div className="p-5 rounded-xl bg-slate-950 border border-emerald-700/60 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-white">
                    Confirme seu e-mail para ativar a conta da oficina
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Por segurança e proteção de dados, mantemos a verificação de e-mail ativa por padrão. Enviamos um link de confirmação para{' '}
                    <strong className="text-white">{pendingConfirmationEmail}</strong>.
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Clique no link recebido no seu e-mail (verifique também a caixa de spam/promoções) para ativar automaticamente seu ambiente isolado (RLS).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {onResendConfirmation && (
                  <button
                    type="button"
                    onClick={() => onResendConfirmation(pendingConfirmationEmail)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white cursor-pointer"
                  >
                    Reenviar e-mail de confirmação
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (onDismissConfirmation) onDismissConfirmation();
                    setLoginEmail(pendingConfirmationEmail);
                    setMode('login');
                  }}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Já confirmei meu e-mail → Entrar
                </button>
              </div>
            </div>
          ) : mode === 'register' ? (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome da Oficina / Empresa *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Alfa Extintores"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    CNPJ (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome do Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Mendes"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Telefone / WhatsApp Comercial *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 99999-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Campinas"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white uppercase focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    E-mail de Acesso *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="comercial@suaoficina.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Senha (mín. 6 caracteres) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Seleção de Oferta em Teste (R$ 49/mês vs R$ 79/mês) */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Escolha o Plano para Teste de Piloto (Sem cobrança ativa agora):
                  </label>
                  <span className="text-[11px] text-slate-400">Hipótese comercial</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['inicial_49', 'profissional_79'] as PlanHypothesisId[]).map((planId) => {
                    const spec = PLAN_HYPOTHESES[planId];
                    const active = selectedPlan === planId;
                    return (
                      <button
                        key={planId}
                        type="button"
                        onClick={() => setSelectedPlan(planId)}
                        className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                          active
                            ? 'bg-red-950/30 border-red-500 ring-1 ring-red-500'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{spec.name}</span>
                          {active && <CheckCircle2 className="w-4 h-4 text-red-400" />}
                        </div>
                        <div className="text-lg font-extrabold text-white mt-1">
                          R$ {spec.monthlyPriceBrl}
                          <span className="text-xs font-normal text-slate-400">/mês</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Até {spec.maxClients} clientes na carteira
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                <strong className="text-white">Isolamento Técnico por RLS:</strong> Ao confirmar seu e-mail, sua conta recebe um identificador próprio (<code className="font-mono">company_id</code>) protegido por políticas de <em>Row Level Security (RLS)</em> no PostgreSQL. Nenhuma outra empresa visualiza seus registros. Para testes sem cadastro, utilize apenas a demonstração fictícia (<code className="font-mono">/demo/</code>).
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Criar Conta da Oficina e Começar
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  E-mail cadastrado
                </label>
                <input
                  type="email"
                  required
                  placeholder="comercial@suaoficina.com.br"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                Entrar no RenovaExt
              </button>
              {onRequestPasswordReset && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => onRequestPasswordReset(loginEmail)}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Esqueci minha senha (enviar link de redefinição para o e-mail acima)
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
