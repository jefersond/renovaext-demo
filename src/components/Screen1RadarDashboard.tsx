import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  Search,
  ShieldAlert,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  DashboardMetrics,
  OPPORTUNITY_STAGE_LABELS,
  OpportunityStage,
  RADAR_WINDOW_LABELS,
  RadarWindow,
} from '../types/domain';
import { ClientRadarSummary } from '../services/radarEngine';
import { formatIsoDateBr } from '../services/pdfProposalGenerator';

interface Screen1RadarDashboardProps {
  metrics: DashboardMetrics;
  summaries: ClientRadarSummary[];
  onGoToImport: () => void;
  onSelectClientForProposal: (clientId: string) => void;
  onSelectClientInPortfolio: (clientId: string) => void;
}

export const Screen1RadarDashboard: React.FC<Screen1RadarDashboardProps> = ({
  metrics,
  summaries,
  onGoToImport,
  onSelectClientForProposal,
  onSelectClientInPortfolio,
}) => {
  const [selectedWindow, setSelectedWindow] = useState<'TODOS' | RadarWindow>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'TODOS' | OpportunityStage>('TODOS');

  const filteredSummaries = useMemo(() => {
    return summaries.filter((item) => {
      if (selectedWindow !== 'TODOS' && item.radarWindow !== selectedWindow) {
        return false;
      }
      if (stageFilter !== 'TODOS' && item.client.opportunityStage !== stageFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = item.client.name.toLowerCase().includes(q);
        const matchOrg = item.client.organizationName.toLowerCase().includes(q);
        const matchContact = item.client.contactName.toLowerCase().includes(q);
        const matchCity = item.client.city.toLowerCase().includes(q);
        if (!matchName && !matchOrg && !matchContact && !matchCity) {
          return false;
        }
      }
      return true;
    });
  }, [summaries, selectedWindow, stageFilter, searchQuery]);

  const getWindowBadge = (summary: ClientRadarSummary) => {
    switch (summary.radarWindow) {
      case 'ATRASADO':
        return {
          label: `A conferir agora (${Math.abs(summary.daysUntilDue || 0)}d atrasado)`,
          className: 'bg-red-100 text-red-900 border-red-300 font-bold',
        };
      case 'D_30':
        return {
          label: `Próximos 30 dias (${summary.daysUntilDue}d)`,
          className: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
        };
      case 'D_60':
        return {
          label: `Próximos 60 dias (${summary.daysUntilDue}d)`,
          className: 'bg-blue-50 text-blue-900 border-blue-200 font-medium',
        };
      case 'D_90':
        return {
          label: `Próximos 90 dias (${summary.daysUntilDue}d)`,
          className: 'bg-slate-100 text-slate-800 border-slate-300 font-medium',
        };
      case 'INCOMPLETO':
        return {
          label: 'Necessita conferência (Dados incompletos)',
          className: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
        };
      default:
        return {
          label: `Acima de 90 dias (${summary.daysUntilDue}d)`,
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Tela 1 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#116b59] font-bold">
            TELA 1 DE 3 • PAINEL PRINCIPAL E RADAR DE RENOVAÇÕES
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Painel de Vencimentos e Acompanhamento Comercial
          </h1>
          <p className="text-xs text-slate-600">
            Visualize os clientes que precisam ser contatados por janela de acompanhamento e revise registros pendentes.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToImport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#0c373e] hover:bg-[#0d5148] text-white text-xs font-bold shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
          Importar Planilha CSV / XLSX
        </button>
      </div>

      {/* Grade de Indicadores do Painel Principal (Seção 3.C) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Clientes</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.totalClients}
          </div>
          <div className="text-[11px] text-slate-500">Na carteira</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Equipamentos</span>
            <Flame className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.totalEquipmentsCount}
          </div>
          <div className="text-[11px] text-slate-500">Unidades reg.</div>
        </div>

        <div className="bg-red-50/70 p-3 rounded-xl border border-red-200 shadow-sm">
          <div className="flex items-center justify-between text-red-800 text-xs font-bold">
            <span>Atrasados</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-extrabold text-red-700 mt-0.5">
            {metrics.overdueClientsCount}
          </div>
          <div className="text-[11px] text-red-700">Conferir agora</div>
        </div>

        <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 shadow-sm">
          <div className="flex items-center justify-between text-amber-900 text-xs font-bold">
            <span>Próx. 30 / 60 / 90d</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-extrabold text-amber-800 mt-0.5">
            {metrics.due30ClientsCount + metrics.due60ClientsCount + metrics.due90ClientsCount}
          </div>
          <div className="text-[11px] text-amber-800">
            {metrics.due30ClientsCount} (30d) • {metrics.due60ClientsCount} (60d) • {metrics.due90ClientsCount} (90d)
          </div>
        </div>

        <div className="bg-purple-50/70 p-3 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-900 text-xs font-bold">
            <span>Conferência</span>
            <ShieldAlert className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold text-purple-800 mt-0.5">
            {metrics.incompleteClientsCount}
          </div>
          <div className="text-[11px] text-purple-800">Dados incompletos</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Oportunidades</span>
            <ClipboardList className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.pendingOpportunitiesCount}
          </div>
          <div className="text-[11px] text-slate-500">Pendentes no funil</div>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-600 text-xs font-medium">
            <span>Propostas</span>
            <FileText className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-slate-900 mt-0.5">
            {metrics.proposalsCreatedCount}
          </div>
          <div className="text-[11px] text-slate-600">
            <span className="text-emerald-700 font-semibold">{metrics.proposalsAcceptedCount} aceitas</span> •{' '}
            <span className="text-red-700 font-semibold">{metrics.proposalsLostCount} perdidas</span>
          </div>
        </div>
      </div>

      {/* Seletores Rápidos do Radar de Renovações (Seção 3.E) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              Radar de Renovações por Período
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em uma faixa para filtrar os clientes ou revise os registros com dados incompletos.
            </p>
          </div>

          {/* Filtros de Busca por Cliente e Etapa */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Buscar cliente, condomínio ou cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value as 'TODOS' | OpportunityStage)}
                aria-label="Filtrar por etapa comercial"
                className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs bg-white text-slate-700"
              >
                <option value="TODOS">Todas as etapas do funil</option>
                {Object.entries(OPPORTUNITY_STAGE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Botões das 5 Janelas Obrigatórias do Radar */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedWindow('TODOS')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedWindow === 'TODOS'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos ({summaries.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedWindow('ATRASADO')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedWindow === 'ATRASADO'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
            }`}
          >
            A conferir agora / Atrasados ({metrics.overdueClientsCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedWindow('D_30')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedWindow === 'D_30'
                ? 'bg-amber-600 text-white border-amber-600'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            Próximos 30 dias ({metrics.due30ClientsCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedWindow('D_60')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedWindow === 'D_60'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100'
            }`}
          >
            Próximos 60 dias ({metrics.due60ClientsCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedWindow('D_90')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedWindow === 'D_90'
                ? 'bg-slate-700 text-white border-slate-700'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
            }`}
          >
            Próximos 90 dias ({metrics.due90ClientsCount})
          </button>

          <button
            type="button"
            onClick={() => setSelectedWindow('INCOMPLETO')}
            className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              selectedWindow === 'INCOMPLETO'
                ? 'bg-purple-700 text-white border-purple-700'
                : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
            }`}
          >
            Dados incompletos / Conferência ({metrics.incompleteClientsCount})
          </button>
        </div>

        {/* Lista de Clientes no Radar */}
        {filteredSummaries.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Nenhum cliente encontrado para os filtros selecionados.
            </p>
            <p className="text-xs text-slate-500">
              Importe sua planilha CSV/XLSX ou limpe os filtros de período acima.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSummaries.map((summary) => {
              const badge = getWindowBadge(summary);
              return (
                <div
                  key={summary.client.id}
                  className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full border ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                        Funil: {OPPORTUNITY_STAGE_LABELS[summary.client.opportunityStage]}
                      </span>
                      {summary.client.isDemo && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-200">
                          DADO FICTÍCIO (DEMO)
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-baseline gap-2 pt-0.5">
                      <h3 className="text-base font-bold text-slate-900">
                        {summary.client.name}
                      </h3>
                      {summary.client.contactName && (
                        <span className="text-xs text-slate-600">
                          • Contato: <strong>{summary.client.contactName}</strong> ({summary.client.contactPhone || 'Sem telefone'})
                        </span>
                      )}
                      {summary.client.city && (
                        <span className="text-xs text-slate-500">• {summary.client.city}</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-700">
                      <strong>Equipamentos registrados ({summary.totalUnits} un.):</strong>{' '}
                      {summary.equipments.length > 0
                        ? summary.equipments
                            .map(
                              (eq) =>
                                `${eq.quantity}x ${eq.extinguisherType}${
                                  eq.capacity ? ' ' + eq.capacity : ''
                                } (Próx. acomp.: ${formatIsoDateBr(eq.nextDueDate)})`
                            )
                            .join(' | ')
                        : 'Nenhum equipamento registrado'}
                    </div>

                    {summary.needsReview && summary.reviewReasons.length > 0 && (
                      <div className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 inline-block">
                        <strong>Necessita conferência:</strong> {summary.reviewReasons.join(' • ')}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectClientInPortfolio(summary.client.id)}
                      className="px-3 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                    >
                      Ver Ficha / Revisar Dados
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectClientForProposal(summary.client.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                    >
                      <span>Oportunidade & Proposta</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Nota Regulatória e Técnica Obrigatória */}
      <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600 flex items-start gap-3">
        <CheckCircle2 className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
        <div>
          <strong>Nota de Responsabilidade Técnica:</strong> As datas exibidas no Radar de Renovações refletem os registros fornecidos pela oficina para agendamento comercial e nunca presunções automáticas sem confirmação. Os requisitos de inspeção e manutenção (Níveis 1, 2 e 3 conforme ABNT NBR 12962 e Portaria INMETRO nº 58/2022) variam segundo o tipo de equipamento, fabricante e condições de conservação. Este painel não emite laudos técnicos nem certificados de conformidade.
        </div>
      </div>
    </div>
  );
};
