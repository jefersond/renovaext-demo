import React, { useEffect, useMemo, useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  Plus,
  Trash2,
  History,
  Copy,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  Client,
  Company,
  EquipmentRecord,
  OPPORTUNITY_STAGE_LABELS,
  OPPORTUNITY_STAGE_ORDER,
  OpportunityHistoryEntry,
  OpportunityStage,
  Proposal,
  ProposalItem,
  ProposalStatus,
} from '../types/domain';
import {
  calculateProposalTotals,
  formatCurrencyBrl,
  formatIsoDateBr,
  generateProposalPdfDocument,
} from '../services/pdfProposalGenerator';

interface Screen3ClientOpportunityProposalProps {
  company: Company;
  clients: Client[];
  equipments: EquipmentRecord[];
  opportunityHistory: OpportunityHistoryEntry[];
  proposals: Proposal[];
  selectedClientId: string | null;
  onSelectClient: (clientId: string) => void;
  onBackToRadar: () => void;
  onUpdateStage: (clientId: string, toStage: OpportunityStage, note: string) => void;
  onCreateProposal: (input: {
    clientId: string;
    validityDays: number;
    items: Omit<ProposalItem, 'subtotalBrl'>[];
    notes: string;
  }) => Proposal;
  onUpdateProposalStatus: (proposalId: string, status: ProposalStatus) => void;
}

interface DraftLineItem {
  id: string;
  selected: boolean;
  equipmentId: string | null;
  equipmentLabel: string;
  serviceDescription: string;
  quantity: number;
  unitPriceInput: string; // String para edição livre pelo usuário sem inventar preço
}

export const Screen3ClientOpportunityProposal: React.FC<
  Screen3ClientOpportunityProposalProps
> = ({
  company,
  clients,
  equipments,
  opportunityHistory,
  proposals,
  selectedClientId,
  onSelectClient,
  onBackToRadar,
  onUpdateStage,
  onCreateProposal,
  onUpdateProposalStatus,
}) => {
  const activeClient = useMemo(() => {
    if (!selectedClientId) return clients[0] || null;
    return clients.find((c) => c.id === selectedClientId) || clients[0] || null;
  }, [clients, selectedClientId]);

  const clientEquipments = useMemo(() => {
    if (!activeClient) return [];
    return equipments.filter((e) => e.clientId === activeClient.id);
  }, [activeClient, equipments]);

  const clientHistory = useMemo(() => {
    if (!activeClient) return [];
    return opportunityHistory.filter((h) => h.clientId === activeClient.id);
  }, [activeClient, opportunityHistory]);

  const clientProposals = useMemo(() => {
    if (!activeClient) return [];
    return proposals.filter((p) => p.clientId === activeClient.id);
  }, [activeClient, proposals]);

  const [stageNote, setStageNote] = useState('');
  const [validityDays, setValidityDays] = useState(company.defaultProposalValidityDays || 15);
  const [proposalNotes, setProposalNotes] = useState(company.defaultProposalNotes || '');
  const [draftItems, setDraftItems] = useState<DraftLineItem[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedTextMsg, setCopiedTextMsg] = useState<string | null>(null);

  // Sempre que mudar o cliente ativo, pré-carregar os equipamentos dele com preço em branco ("")
  useEffect(() => {
    if (!activeClient) {
      setDraftItems([]);
      return;
    }
    setFormError(null);
    setSuccessMsg(null);
    setProposalNotes(company.defaultProposalNotes || '');
    setValidityDays(company.defaultProposalValidityDays || 15);

    if (clientEquipments.length > 0) {
      setDraftItems(
        clientEquipments.map((eq, idx) => ({
          id: `line-${eq.id}-${idx}`,
          selected: true,
          equipmentId: eq.id,
          equipmentLabel: `${eq.extinguisherType}${eq.capacity ? ' ' + eq.capacity : ''}`,
          serviceDescription:
            'Inspeção e Manutenção de 2º Nível (Recarga conforme avaliação técnica)',
          quantity: eq.quantity,
          unitPriceInput: '', // NUNCA inventar preço de serviço!
        }))
      );
    } else {
      setDraftItems([
        {
          id: 'line-default-1',
          selected: true,
          equipmentId: null,
          equipmentLabel: 'Extintor PQS ABC 4kg',
          serviceDescription:
            'Inspeção e Manutenção de 2º Nível (Recarga conforme avaliação técnica)',
          quantity: 1,
          unitPriceInput: '',
        },
      ]);
    }
  }, [activeClient?.id, clientEquipments.length]);

  const parsedItemsForCalculation = useMemo(() => {
    return draftItems
      .filter((it) => it.selected)
      .map((it) => {
        const cleanPrice = parseFloat(it.unitPriceInput.replace(',', '.'));
        return {
          id: it.id,
          equipmentId: it.equipmentId,
          equipmentLabel: it.equipmentLabel,
          serviceDescription: it.serviceDescription,
          quantity: Math.max(1, Number(it.quantity) || 1),
          unitPriceBrl: Number.isNaN(cleanPrice) || cleanPrice < 0 ? 0 : cleanPrice,
        };
      });
  }, [draftItems]);

  const calculatedTotals = useMemo(
    () => calculateProposalTotals(parsedItemsForCalculation),
    [parsedItemsForCalculation]
  );

  const handleStageClick = (toStage: OpportunityStage) => {
    if (!activeClient) return;
    onUpdateStage(activeClient.id, toStage, stageNote);
    setStageNote('');
  };

  const handleAddDraftLine = () => {
    setDraftItems((prev) => [
      ...prev,
      {
        id: `line-custom-${Date.now()}`,
        selected: true,
        equipmentId: null,
        equipmentLabel: 'Extintor CO2 6kg',
        serviceDescription: 'Inspeção Técnica / Manutenção Nível 2 ou Ensaio Hidrostático',
        quantity: 1,
        unitPriceInput: '',
      },
    ]);
  };

  const handleRemoveDraftLine = (id: string) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleGenerateProposalAndDownloadPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;
    setFormError(null);
    setSuccessMsg(null);

    const selectedLines = draftItems.filter((it) => it.selected);
    if (selectedLines.length === 0) {
      setFormError('Selecione pelo menos um equipamento/item para compor a proposta.');
      return;
    }

    const hasMissingPrice = selectedLines.some((it) => {
      const val = parseFloat(it.unitPriceInput.replace(',', '.'));
      return Number.isNaN(val) || val <= 0;
    });

    if (hasMissingPrice) {
      setFormError(
        'Preencha o preço unitário (R$) de todos os itens selecionados. Por regra de segurança, o sistema nunca inventa preços de serviços.'
      );
      return;
    }

    try {
      const createdProposal = onCreateProposal({
        clientId: activeClient.id,
        validityDays,
        items: parsedItemsForCalculation,
        notes: proposalNotes,
      });

      const pdfResult = generateProposalPdfDocument({
        company,
        client: activeClient,
        proposal: createdProposal,
        triggerBrowserDownload: true,
      });

      setSuccessMsg(
        `Proposta ${createdProposal.proposalNumber} criada e PDF (${pdfResult.fileName}) gerado para download! O envio é sempre manual pelo responsável.`
      );
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erro ao gerar proposta.');
    }
  };

  const handleRedownloadPdf = (proposal: Proposal) => {
    if (!activeClient) return;
    generateProposalPdfDocument({
      company,
      client: activeClient,
      proposal,
      triggerBrowserDownload: true,
    });
  };

  const handleCopySummary = async (proposal: Proposal) => {
    if (!activeClient) return;
    const { textSummary } = generateProposalPdfDocument({
      company,
      client: activeClient,
      proposal,
      triggerBrowserDownload: false,
    });
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(textSummary);
    }
    setCopiedTextMsg(`Resumo da proposta ${proposal.proposalNumber} copiado para a área de transferência!`);
    setTimeout(() => setCopiedTextMsg(null), 3000);
  };

  if (!activeClient) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">
          Nenhum cliente cadastrado na carteira ainda.
        </p>
        <button
          type="button"
          onClick={onBackToRadar}
          className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold cursor-pointer"
        >
          Voltar ao Painel
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Tela 3 + Seletor de Cliente */}
      <div className="bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToRadar}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao Radar
            </button>
            <span className="text-slate-300">|</span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#116b59] font-bold">
              TELA 3 DE 3 • CLIENTE, OPORTUNIDADE (FUNIL) E PROPOSTA PDF
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
            {activeClient.name}
          </h1>
          <p className="text-xs text-slate-600">
            Contato: <strong>{activeClient.contactName || 'Não informado'}</strong> • Tel:{' '}
            <strong>{activeClient.contactPhone || 'Não informado'}</strong> • Cidade:{' '}
            <strong>{activeClient.city || company.city}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Alternar cliente:</label>
          <select
            value={activeClient.id}
            onChange={(e) => onSelectClient(e.target.value)}
            aria-label="Selecionar cliente para proposta"
            className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-900"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({OPPORTUNITY_STAGE_LABELS[c.opportunityStage]})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SEÇÃO 1: FUNIL COMERCIAL BÁSICO DE 7 ETAPAS (Seção 3.G) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Etapa da Oportunidade no Funil Comercial
            </h2>
            <p className="text-xs text-slate-500">
              Clique na etapa correspondente para atualizar o status comercial e registrar no histórico.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
            Atual: {OPPORTUNITY_STAGE_LABELS[activeClient.opportunityStage]}
          </span>
        </div>

        {/* Barra das 7 Etapas Obrigatórias */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
          {OPPORTUNITY_STAGE_ORDER.map((stage, idx) => {
            const isCurrent = activeClient.opportunityStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => handleStageClick(stage)}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#0c373e] text-white border-[#0c373e] shadow-sm ring-2 ring-[#116b59]'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-[10px] font-mono opacity-75">ETAPA 0{idx + 1}</div>
                <div className="text-xs font-bold mt-0.5 leading-snug">
                  {OPPORTUNITY_STAGE_LABELS[stage]}
                </div>
              </button>
            );
          })}
        </div>

        {/* Registro de Observação na Movimentação */}
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <input
            type="text"
            placeholder="Anotação comercial opcional (ex: Síndico pediu retorno na quinta-feira às 14h)..."
            value={stageNote}
            onChange={(e) => setStageNote(e.target.value)}
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={() => handleStageClick(activeClient.opportunityStage)}
            disabled={!stageNote.trim()}
            className="px-4 py-2 rounded-lg bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold cursor-pointer"
          >
            Registrar Anotação no Histórico
          </button>
        </div>
      </div>

      {/* SEÇÃO 2: MONTADOR DE PROPOSTA COMERCIAL E GERADOR DE PDF (Seção 3.F) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form
          onSubmit={handleGenerateProposalAndDownloadPdf}
          className="lg:col-span-8 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Preparar Proposta Comercial (PDF)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Oficina emissora: <strong>{company.name}</strong> ({company.phone}) • Informe os preços unitários abaixo.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddDraftLine}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar Item
            </button>
          </div>

          {formError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-semibold"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-900 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Lista de Equipamentos / Serviços da Proposta */}
          <div className="space-y-3">
            {draftItems.map((line, index) => {
              const unitVal = parseFloat(line.unitPriceInput.replace(',', '.'));
              const validUnit = Number.isNaN(unitVal) || unitVal < 0 ? 0 : unitVal;
              const lineSubtotal = Math.round(line.quantity * validUnit * 100) / 100;

              return (
                <div
                  key={line.id}
                  className={`p-4 rounded-xl border transition-colors space-y-3 ${
                    line.selected
                      ? 'bg-slate-50/70 border-slate-300'
                      : 'bg-slate-100/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={line.selected}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id ? { ...it, selected: e.target.checked } : it
                            )
                          )
                        }
                      />
                      <span>Item #{index + 1} da Cotação</span>
                    </label>
                    {draftItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDraftLine(line.id)}
                        className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Remover item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-4">
                      <label className="block text-slate-600 font-medium mb-1">
                        Equipamento *
                      </label>
                      <input
                        type="text"
                        required={line.selected}
                        value={line.equipmentLabel}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id
                                ? { ...it, equipmentLabel: e.target.value }
                                : it
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-slate-600 font-medium mb-1">
                        Serviço a Cotar *
                      </label>
                      <input
                        type="text"
                        required={line.selected}
                        value={line.serviceDescription}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id
                                ? { ...it, serviceDescription: e.target.value }
                                : it
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-600 font-medium mb-1">
                        Qtd *
                      </label>
                      <input
                        type="number"
                        min={1}
                        required={line.selected}
                        value={line.quantity}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id
                                ? { ...it, quantity: Math.max(1, Number(e.target.value) || 1) }
                                : it
                            )
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-slate-900 font-bold mb-1">
                        Preço Unit. (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        aria-label={`Preço unitário do item ${index + 1}`}
                        value={line.unitPriceInput}
                        onChange={(e) =>
                          setDraftItems((prev) =>
                            prev.map((it) =>
                              it.id === line.id
                                ? { ...it, unitPriceInput: e.target.value }
                                : it
                            )
                          )
                        }
                        className="w-full rounded-lg border-2 border-red-300 focus:border-red-600 bg-white px-2.5 py-2 font-mono font-bold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end text-xs text-slate-600">
                    Subtotal do item:{' '}
                    <strong className="ml-1 font-mono text-slate-900">
                      {formatCurrencyBrl(lineSubtotal)}
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Validade, Observações e Total Calculado */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 pt-2 border-t border-slate-200">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Validade da Proposta (dias)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={validityDays}
                onChange={(e) => setValidityDays(Number(e.target.value) || 15)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
            <div className="sm:col-span-9">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Observações da Proposta (Condições de retirada, pagamento, extintores reserva)
              </label>
              <textarea
                rows={2}
                value={proposalNotes}
                onChange={(e) => setProposalNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs"
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-slate-400 uppercase">
                TOTAL CALCULADO DA PROPOSTA
              </div>
              <div className="text-2xl font-extrabold font-mono text-white mt-0.5">
                {formatCurrencyBrl(calculatedTotals.totalBrl)}
              </div>
              <div className="text-[11px] text-slate-400">
                Download local imediato em PDF • Nenhum envio automático externo é disparado.
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm transition-colors cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              Salvar Proposta e Baixar PDF
            </button>
          </div>
        </form>

        {/* Coluna Lateral: Propostas Emitidas e Histórico do Funil */}
        <div className="lg:col-span-4 space-y-6">
          {/* Propostas do Cliente */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-600" />
              Propostas Emitidas ({clientProposals.length})
            </h3>

            {copiedTextMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold">
                {copiedTextMsg}
              </div>
            )}

            {clientProposals.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhuma proposta criada para este cliente. Preencha os preços ao lado e gere o PDF.
              </p>
            ) : (
              <div className="space-y-3">
                {clientProposals.map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {prop.proposalNumber}
                      </span>
                      <span className="font-mono font-bold text-red-700">
                        {formatCurrencyBrl(prop.totalBrl)}
                      </span>
                    </div>
                    <div className="text-slate-500">
                      Emitida em {formatIsoDateBr(prop.createdAt.slice(0, 10))} • Validade:{' '}
                      {prop.validityDays}d
                    </div>

                    <div className="flex items-center gap-1.5">
                      <label className="text-slate-600 font-medium">Status:</label>
                      <select
                        value={prop.status}
                        onChange={(e) =>
                          onUpdateProposalStatus(prop.id, e.target.value as ProposalStatus)
                        }
                        className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold"
                      >
                        <option value="gerada">Gerada</option>
                        <option value="enviada">Enviada ao cliente</option>
                        <option value="aceita">Aceita (Fechada)</option>
                        <option value="perdida">Perdida</option>
                      </select>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleRedownloadPdf(prop)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopySummary(prop)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copiar Texto
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico de Movimentações do Funil */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              Histórico Comercial da Oportunidade
            </h3>
            {clientHistory.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhuma movimentação registrada.</p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {clientHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {OPPORTUNITY_STAGE_LABELS[entry.toStage]}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(entry.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <p className="text-slate-600">{entry.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
