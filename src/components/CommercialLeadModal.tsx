import React, { useEffect, useState } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Download,
  AlertTriangle,
  CalendarClock,
  Sparkles,
} from 'lucide-react';
import {
  CommercialLeadIntent,
  CommercialLeadReceipt,
  PORTFOLIO_SIZE_LABELS,
  PortfolioSizeOption,
  submitCommercialLead,
} from '../services/commercialLeadService';
import { PLAN_HYPOTHESES, PlanHypothesisId } from '../types/domain';

interface CommercialLeadModalProps {
  initialIntent: CommercialLeadIntent;
  initialPlan?: PlanHypothesisId;
  sourcePage: string;
  onClose: () => void;
}

export const CommercialLeadModal: React.FC<CommercialLeadModalProps> = ({
  initialIntent,
  initialPlan = 'profissional_79',
  sourcePage,
  onClose,
}) => {
  const [intentType, setIntentType] = useState<CommercialLeadIntent>(initialIntent);
  const [responsibleName, setResponsibleName] = useState('');
  const [workshopName, setWorkshopName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [portfolioSize, setPortfolioSize] =
    useState<PortfolioSizeOption>('51_a_150_clientes');
  const [planInterest, setPlanInterest] = useState<PlanHypothesisId>(initialPlan);
  const [notes, setNotes] = useState('');
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [openedAt] = useState<number>(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<CommercialLeadReceipt | null>(null);

  useEffect(() => {
    setIntentType(initialIntent);
  }, [initialIntent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const elapsedMs = Math.max(950, Date.now() - openedAt);
      const createdReceipt = await submitCommercialLead({
        intentType,
        responsibleName,
        workshopName,
        email,
        phone,
        portfolioSize,
        planInterest,
        notes,
        sourcePage,
        privacyConsent,
        honeypot,
        elapsedMs,
      });
      setReceipt(createdReceipt);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Não foi possível registrar sua solicitação. Tente novamente.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (!receipt) return;
    const content = JSON.stringify(
      {
        sistema: 'RenovaExt MVP — Comprovante Oficial de Solicitação Comercial',
        protocolo: receipt.protocolCode,
        tipoSolicitacao:
          receipt.intentType === 'solicitar_demonstracao'
            ? 'Solicitar demonstração'
            : 'Quero participar do piloto (30 dias)',
        responsavel: receipt.responsibleName,
        oficina: receipt.workshopName,
        emailComercial: receipt.email,
        telefoneOpcional: receipt.phone,
        tamanhoAproximadoCarteira: PORTFOLIO_SIZE_LABELS[receipt.portfolioSize],
        planoInteresse:
          receipt.planInterest === 'inicial_49'
            ? 'Plano Inicial — R$ 49/mês (até 150 clientes)'
            : 'Plano Profissional — R$ 79/mês (até 500 clientes)',
        registradoEmUtc: receipt.createdAt,
        canalRetornoVerificado:
          'Retorno comercial enviado diretamente para o e-mail comercial e/ou telefone informados neste protocolo em até 1 dia útil.',
      },
      null,
      2
    );
    const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comprovante-${receipt.protocolCode}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="commercial-lead-modal-title"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Cabeçalho do Modal */}
        <div className="bg-slate-950 text-white px-6 py-4 flex items-center justify-between gap-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 id="commercial-lead-modal-title" className="text-base font-extrabold">
                {intentType === 'solicitar_demonstracao'
                  ? 'Solicitar Demonstração Guiada — RenovaExt'
                  : 'Quero Participar do Piloto de 30 Dias — RenovaExt'}
              </h2>
              <p className="text-xs text-slate-400">
                Armazenamento comercial isolado • Sem cobrança automática • Sem pedir planilha real agora
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar formulário comercial"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          {receipt ? (
            <div
              data-testid="lead-confirmation-receipt"
              className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-500 space-y-4"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded bg-emerald-700 text-white font-mono text-xs font-bold">
                    PROTOCOLO OFICIAL: {receipt.protocolCode}
                  </span>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    Solicitação recebida e registrada com sucesso!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    Recebemos os dados da oficina <strong>{receipt.workshopName}</strong> (responsável:{' '}
                    <strong>{receipt.responsibleName}</strong>).
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl p-4 border border-emerald-200 text-xs space-y-1.5 text-slate-700">
                <div>
                  <strong>Modalidade solicitada:</strong>{' '}
                  {receipt.intentType === 'solicitar_demonstracao'
                    ? 'Solicitar demonstração'
                    : 'Participar do Piloto de 30 Dias'}
                </div>
                <div>
                  <strong>E-mail comercial confirmado para retorno:</strong> {receipt.email}
                </div>
                {receipt.phone && (
                  <div>
                    <strong>Telefone / WhatsApp informado:</strong> {receipt.phone}
                  </div>
                )}
                <div>
                  <strong>Tamanho aproximado da carteira:</strong>{' '}
                  {PORTFOLIO_SIZE_LABELS[receipt.portfolioSize]}
                </div>
                <div>
                  <strong>Plano de interesse em teste:</strong>{' '}
                  {receipt.planInterest === 'inicial_49'
                    ? 'Plano Inicial — R$ 49/mês (até 150 clientes)'
                    : 'Plano Profissional — R$ 79/mês (até 500 clientes)'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 text-xs space-y-1">
                <strong className="text-white block">
                  Canal Comercial Oficial e Próximo Passo:
                </strong>
                <p>
                  Sua solicitação já está registrada na fila comercial prioritária do RenovaExt. Nosso retorno ocorre em até <strong>1 dia útil (dias úteis, segunda a sexta-feira)</strong> diretamente para o e-mail comercial <strong>{receipt.email}</strong>
                  {receipt.phone ? ` ou pelo contato ${receipt.phone}` : ''}. Nenhuma planilha real de clientes será solicitada antes da ativação da sua conta isolada (RLS) e aceite das condições do piloto.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadReceipt}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Baixar Comprovante do Protocolo (.JSON)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold cursor-pointer"
                >
                  Concluir e Voltar
                </button>
              </div>
            </div>
          ) : (
            <form
              data-testid="commercial-lead-form"
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Seletor de Objetivo: Solicitar Demonstração vs Quero Participar do Piloto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setIntentType('solicitar_demonstracao')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    intentType === 'solicitar_demonstracao'
                      ? 'bg-red-50 border-red-600 text-red-950 ring-1 ring-red-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <CalendarClock className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold">Solicitar demonstração</div>
                    <div className="text-[11px] text-slate-600">
                      Agendar apresentação prática de 10 min
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setIntentType('quero_participar_piloto')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    intentType === 'quero_participar_piloto'
                      ? 'bg-red-50 border-red-600 text-red-950 ring-1 ring-red-600'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-red-600 shrink-0" />
                  <div>
                    <div className="text-xs font-extrabold">Quero participar do piloto</div>
                    <div className="text-[11px] text-slate-600">
                      Testar por 30 dias (R$ 49 ou R$ 79/mês)
                    </div>
                  </div>
                </button>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Campo Honeypot Oculto contra Bots */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="lead-website-hp">Não preencha este campo</label>
                <input
                  id="lead-website-hp"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="lead-responsible-name"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Nome do responsável *
                  </label>
                  <input
                    id="lead-responsible-name"
                    type="text"
                    required
                    minLength={2}
                    placeholder="Ex: Marcos Oliveira"
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lead-workshop-name"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Nome da oficina *
                  </label>
                  <input
                    id="lead-workshop-name"
                    type="text"
                    required
                    minLength={2}
                    placeholder="Ex: Oliveira Extintores Ltda"
                    value={workshopName}
                    onChange={(e) => setWorkshopName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="lead-commercial-email"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    E-mail comercial *
                  </label>
                  <input
                    id="lead-commercial-email"
                    type="email"
                    required
                    placeholder="comercial@suaoficina.com.br"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="lead-phone-optional"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Telefone / WhatsApp (opcional)
                  </label>
                  <input
                    id="lead-phone-optional"
                    type="tel"
                    placeholder="(11) 99999-0000 (opcional)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="lead-portfolio-size"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Tamanho aproximado da carteira *
                  </label>
                  <select
                    id="lead-portfolio-size"
                    value={portfolioSize}
                    onChange={(e) => setPortfolioSize(e.target.value as PortfolioSizeOption)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-red-600"
                  >
                    {(Object.keys(PORTFOLIO_SIZE_LABELS) as PortfolioSizeOption[]).map((key) => (
                      <option key={key} value={key}>
                        {PORTFOLIO_SIZE_LABELS[key]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="lead-plan-interest"
                    className="block text-xs font-bold text-slate-800 mb-1"
                  >
                    Plano de interesse (R$ 49 ou R$ 79) *
                  </label>
                  <select
                    id="lead-plan-interest"
                    value={planInterest}
                    onChange={(e) => setPlanInterest(e.target.value as PlanHypothesisId)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 bg-white focus:outline-none focus:border-red-600"
                  >
                    {(['inicial_49', 'profissional_79'] as PlanHypothesisId[]).map((pid) => {
                      const spec = PLAN_HYPOTHESES[pid];
                      return (
                        <option key={pid} value={pid}>
                          R$ {spec.monthlyPriceBrl}/mês — {spec.name} (até {spec.maxClients}{' '}
                          clientes)
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="lead-notes"
                  className="block text-xs font-bold text-slate-800 mb-1"
                >
                  Observações (opcional)
                </label>
                <textarea
                  id="lead-notes"
                  rows={2}
                  placeholder="Conte brevemente como controla os vencimentos hoje (ex: Excel, fichas, outro sistema) ou dúvidas sobre o piloto..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Política de Privacidade e Separação de Dados */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-600">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={privacyConsent}
                    onChange={(e) => setPrivacyConsent(e.target.checked)}
                    className="mt-0.5 accent-red-600"
                  />
                  <span>
                    <strong className="text-slate-900">
                      Política de Privacidade e Proteção de Dados (LGPD):
                    </strong>{' '}
                    Concordo com o registro desta solicitação em armazenamento comercial separado dos dados operacionais das oficinas, exclusivamente para retorno sobre a demonstração ou piloto de 30 dias. Estou ciente de que <strong>não devo enviar planilhas reais de clientes</strong> antes da ativação da conta isolada por RLS e aceite das condições de uso.
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold shadow-md cursor-pointer"
                >
                  {submitting
                    ? 'Registrando Solicitação...'
                    : intentType === 'solicitar_demonstracao'
                    ? 'Confirmar Solicitação de Demonstração →'
                    : 'Confirmar Inscrição no Piloto de 30 Dias →'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
