import React, { useState } from 'react';
import { X, Building2, Shield, Download, History } from 'lucide-react';
import {
  AuditLogEntry,
  Company,
  PLAN_HYPOTHESES,
  PlanHypothesisId,
} from '../types/domain';

interface CompanySettingsModalProps {
  company: Company;
  auditLogs: AuditLogEntry[];
  registeredCompanies: Array<{
    companyId: string;
    companyName: string;
    email: string;
    isDemoCompany: boolean;
  }>;
  onClose: () => void;
  onSaveSettings: (patch: {
    name: string;
    cnpj: string;
    responsibleName: string;
    phone: string;
    city: string;
    state: string;
    selectedPlanHypothesis: PlanHypothesisId;
    defaultProposalValidityDays: number;
    defaultProposalNotes: string;
  }) => void;
  onExportDataJson: () => void;
  onSwitchCompany: (companyId: string) => void;
}

export const CompanySettingsModal: React.FC<CompanySettingsModalProps> = ({
  company,
  auditLogs,
  registeredCompanies,
  onClose,
  onSaveSettings,
  onExportDataJson,
  onSwitchCompany,
}) => {
  const [tab, setTab] = useState<'profile' | 'audit' | 'isolation'>('profile');
  const [name, setName] = useState(company.name);
  const [cnpj, setCnpj] = useState(company.cnpj);
  const [responsibleName, setResponsibleName] = useState(company.responsibleName);
  const [phone, setPhone] = useState(company.phone);
  const [city, setCity] = useState(company.city);
  const [stateUf, setStateUf] = useState(company.state);
  const [selectedPlan, setSelectedPlan] = useState<PlanHypothesisId>(
    company.selectedPlanHypothesis
  );
  const [validityDays, setValidityDays] = useState(company.defaultProposalValidityDays);
  const [defaultNotes, setDefaultNotes] = useState(company.defaultProposalNotes);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      name,
      cnpj,
      responsibleName,
      phone,
      city,
      state: stateUf,
      selectedPlanHypothesis: selectedPlan,
      defaultProposalValidityDays: validityDays,
      defaultProposalNotes: defaultNotes,
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="font-bold text-base">Configurações da Oficina & Segurança</h2>
              <p className="text-xs text-slate-400">
                ID Isolado (RLS): <span className="font-mono">{company.id}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Internas */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-4 py-3 text-xs font-bold border-b-2 cursor-pointer ${
              tab === 'profile'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Dados da Oficina e Plano
          </button>
          <button
            type="button"
            onClick={() => setTab('audit')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'audit'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Logs de Auditoria ({auditLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('isolation')}
            className={`px-4 py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 cursor-pointer ${
              tab === 'isolation'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Privacidade & Isolamento (RLS)
          </button>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {tab === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {savedBanner && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                  ✓ Configurações da oficina atualizadas com sucesso!
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome da Oficina (Sai no cabeçalho do PDF) *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Responsável Comercial / Técnico *
                  </label>
                  <input
                    type="text"
                    required
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Telefone / WhatsApp *
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cidade *
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    UF *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={2}
                    value={stateUf}
                    onChange={(e) => setStateUf(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Plano Comercial em Teste
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value as PlanHypothesisId)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white"
                  >
                    <option value="inicial_49">
                      Plano Inicial — R$ 49/mês (Até {PLAN_HYPOTHESES.inicial_49.maxClients} clientes)
                    </option>
                    <option value="profissional_79">
                      Plano Profissional — R$ 79/mês (Até {PLAN_HYPOTHESES.profissional_79.maxClients} clientes)
                    </option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validade Padrão das Propostas (Dias)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={validityDays}
                    onChange={(e) => setValidityDays(Number(e.target.value) || 15)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Padrão nas Propostas PDF
                </label>
                <textarea
                  rows={3}
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-3 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Salvar Configurações
                </button>
              </div>
            </form>
          )}

          {tab === 'audit' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Registro cronológico das operações relevantes executadas na conta desta oficina:
              </p>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden">
                {auditLogs.slice(0, 40).map((log) => (
                  <div key={log.id} className="p-3 bg-white text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-800 px-2 py-0.5 rounded bg-slate-100">
                        {log.action}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(log.createdAt).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-700">{log.details}</p>
                    <p className="text-[11px] text-slate-400">Usuário: {log.actorEmail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'isolation' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Exportação Completa de Dados (LGPD / Portabilidade)
                </h3>
                <p className="text-xs text-slate-600">
                  Você pode baixar a qualquer momento uma cópia integral de todos os clientes, equipamentos, histórico comercial e propostas pertencentes exclusivamente à sua oficina.
                </p>
                <button
                  type="button"
                  onClick={onExportDataJson}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Exportar Dados da Minha Empresa (.JSON)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Garantia de Isolamento por Empresa (Multi-Tenant RLS)
                </h3>
                <p className="text-xs text-slate-600">
                  Sua oficina possui um identificador exclusivo (<code className="font-mono">{company.id}</code>). Políticas de Row Level Security (RLS) no banco de dados garantem que nenhuma outra empresa consiga visualizar, editar ou exportar os registros da sua carteira.
                </p>
                <div className="p-3 rounded-lg border bg-red-50 border-red-300 font-semibold text-red-950 flex items-center justify-between text-xs">
                  <div>
                    <div>{company.name}</div>
                    <div className="text-[11px] text-slate-600">{company.email}</div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[11px]">
                    Sessão Isolada Ativa
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
