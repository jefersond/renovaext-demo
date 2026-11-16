import React, { useMemo, useState } from 'react';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Search,
  Download,
  ArrowRight,
  Edit3,
  History,
  FileText,
  Flame,
} from 'lucide-react';
import {
  Client,
  EquipmentRecord,
  OPPORTUNITY_STAGE_LABELS,
  ParsedImportRow,
  Proposal,
  ServiceHistoryEntry,
  SpreadsheetColumnMapping,
} from '../types/domain';
import {
  buildImportPreviewRows,
  generateSampleSpreadsheetCsv,
  parseSpreadsheetBuffer,
  RawSpreadsheetData,
  suggestColumnMapping,
} from '../services/spreadsheetImportEngine';
import { formatCurrencyBrl, formatIsoDateBr } from '../services/pdfProposalGenerator';

interface Screen2ImportAndPortfolioProps {
  clients: Client[];
  equipments: EquipmentRecord[];
  serviceHistory: ServiceHistoryEntry[];
  proposals: Proposal[];
  selectedPortfolioClientId: string | null;
  onSelectPortfolioClient: (clientId: string | null) => void;
  onCommitImport: (rows: ParsedImportRow[]) => {
    importedClientsCount: number;
    importedEquipmentsCount: number;
    flaggedForReviewCount: number;
    skippedDuplicatesCount: number;
  };
  onSaveClient: (input: {
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
  }) => Client;
  onSaveEquipment: (input: {
    equipmentId?: string;
    clientId: string;
    description: string;
    extinguisherType: string;
    capacity: string | null;
    quantity: number;
    lastServiceDate: string | null;
    nextDueDate: string | null;
    notes: string;
  }) => void;
  onOpenClientInScreen3: (clientId: string) => void;
  onExportCompanyData: () => void;
  isDemoMode?: boolean;
  onOpenCommercialLeadModal?: (
    intent: 'solicitar_demonstracao' | 'quero_participar_piloto'
  ) => void;
}

export const Screen2ImportAndPortfolio: React.FC<Screen2ImportAndPortfolioProps> = ({
  clients,
  equipments,
  serviceHistory,
  proposals,
  selectedPortfolioClientId,
  onSelectPortfolioClient,
  onCommitImport,
  onSaveClient,
  onSaveEquipment,
  onOpenClientInScreen3,
  onExportCompanyData,
  isDemoMode = false,
  onOpenCommercialLeadModal,
}) => {
  // Controle do Assistente de Importação
  const [wizardOpen, setWizardOpen] = useState(true);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [rawSheet, setRawSheet] = useState<RawSpreadsheetData | null>(null);
  const [mapping, setMapping] = useState<SpreadsheetColumnMapping>({
    clientName: '',
    organizationName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    city: '',
    equipmentDescription: '',
    extinguisherType: '',
    capacity: '',
    quantity: '',
    lastServiceDate: '',
    nextDueDate: '',
    notes: '',
  });
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResultBanner, setImportResultBanner] = useState<string | null>(null);

  // Controle da Carteira de Clientes e Modal de Novo Cliente / Equipamento
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: '',
    organizationName: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    city: '',
    notes: '',
  });

  // Formulário para adicionar/editar equipamento na ficha do cliente
  const [editingEquipId, setEditingEquipId] = useState<string | undefined>(undefined);
  const [equipForm, setEquipForm] = useState({
    extinguisherType: 'PQS ABC',
    capacity: '4kg',
    quantity: 1,
    description: '',
    lastServiceDate: '',
    nextDueDate: '',
    notes: '',
  });
  const [showEquipForm, setShowEquipForm] = useState(false);

  const existingFingerprints = useMemo(
    () => new Set(equipments.map((e) => e.dedupeFingerprint)),
    [equipments]
  );

  const activeClient = useMemo(() => {
    if (!selectedPortfolioClientId) return clients[0] || null;
    return clients.find((c) => c.id === selectedPortfolioClientId) || clients[0] || null;
  }, [clients, selectedPortfolioClientId]);

  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) return clients;
    const q = searchQuery.trim().toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.organizationName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDemoMode) {
      setImportError(
        'Proteção de Dados Ativa: O envio de planilhas externas reais está bloqueado na demonstração pública. Utilize o botão "Carregar Planilha de Exemplo no Assistente" ou solicite o seu piloto isolado.'
      );
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportResultBanner(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSpreadsheetBuffer(buffer, file.name);
      const suggested = suggestColumnMapping(parsed.headers);
      setRawSheet(parsed);
      setMapping(suggested);
      setWizardStep(2);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao ler planilha.');
    }
  };

  const handleLoadSampleSpreadsheet = () => {
    setImportError(null);
    setImportResultBanner(null);
    try {
      const csvText = generateSampleSpreadsheetCsv();
      const encoder = new TextEncoder();
      const buffer = encoder.encode(csvText).buffer;
      const parsed = parseSpreadsheetBuffer(buffer, 'planilha-exemplo-oficina.csv');
      const suggested = suggestColumnMapping(parsed.headers);
      setRawSheet(parsed);
      setMapping(suggested);
      setWizardStep(2);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao carregar exemplo.');
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvText = generateSampleSpreadsheetCsv();
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-planilha-renovaext.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleProceedToPreview = () => {
    if (!rawSheet) return;
    if (!mapping.clientName && !mapping.organizationName) {
      setImportError(
        'Associe pelo menos a coluna de "Nome do Cliente" ou "Empresa / Condomínio" para prosseguir.'
      );
      return;
    }
    setImportError(null);
    const rows = buildImportPreviewRows(rawSheet.rows, mapping, existingFingerprints);
    setPreviewRows(rows);
    setWizardStep(3);
  };

  const handleUpdatePreviewRow = (
    rowIndex: number,
    patch: Partial<
      Pick<
        ParsedImportRow,
        | 'selected'
        | 'clientName'
        | 'contactName'
        | 'extinguisherType'
        | 'capacity'
        | 'quantity'
        | 'lastServiceDate'
        | 'nextDueDate'
      >
    >
  ) => {
    setPreviewRows((prev) =>
      prev.map((row) => {
        if (row.rowIndex !== rowIndex) return row;
        const updated = { ...row, ...patch };
        // Recalcular se ainda necessita conferência após edição manual
        const reasons: string[] = [];
        if (!updated.clientName.trim()) {
          reasons.push('Nome do cliente ausente');
        }
        if (
          !updated.extinguisherType.trim() ||
          updated.extinguisherType === 'Não informado'
        ) {
          reasons.push('Tipo de extintor não especificado — necessita conferência');
        }
        if (!updated.nextDueDate) {
          reasons.push(
            'Data de próximo acompanhamento não informada — necessita conferência'
          );
        }
        updated.reviewReasons = reasons;
        updated.needsReview = reasons.length > 0;
        return updated;
      })
    );
  };

  const handleConfirmImport = () => {
    try {
      setImportError(null);
      const summary = onCommitImport(previewRows);
      setImportResultBanner(
        `Importação concluída: ${summary.importedClientsCount} clientes novos, ${summary.importedEquipmentsCount} lotes de equipamentos adicionados (${summary.flaggedForReviewCount} marcados para conferência, ${summary.skippedDuplicatesCount} duplicatas ignoradas).`
      );
      setWizardStep(1);
      setRawSheet(null);
      setPreviewRows([]);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao confirmar importação.');
    }
  };

  const handleCreateManualClient = (e: React.FormEvent) => {
    e.preventDefault();
    const rawName = newClientForm.name.trim();
    const safeName =
      isDemoMode && !rawName.toLowerCase().includes('fictício')
        ? `${rawName} (Fictício — Demo)`
        : rawName;
    const created = onSaveClient({
      name: safeName,
      organizationName: newClientForm.organizationName || safeName,
      contactName: newClientForm.contactName,
      contactPhone: newClientForm.contactPhone,
      contactEmail: newClientForm.contactEmail,
      city: newClientForm.city,
      notes: newClientForm.notes,
      needsReview: true,
      reviewReason: 'Recém-cadastrado: adicione os equipamentos e datas de acompanhamento.',
    });
    setNewClientForm({
      name: '',
      organizationName: '',
      contactName: '',
      contactPhone: '',
      contactEmail: '',
      city: '',
      notes: '',
    });
    setShowNewClientForm(false);
    onSelectPortfolioClient(created.id);
  };

  const handleEquipmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;
    onSaveEquipment({
      equipmentId: editingEquipId,
      clientId: activeClient.id,
      description:
        equipForm.description ||
        `${equipForm.quantity}x ${equipForm.extinguisherType} ${equipForm.capacity}`,
      extinguisherType: equipForm.extinguisherType,
      capacity: equipForm.capacity || null,
      quantity: Number(equipForm.quantity) || 1,
      lastServiceDate: equipForm.lastServiceDate || null,
      nextDueDate: equipForm.nextDueDate || null,
      notes: equipForm.notes,
    });
    setShowEquipForm(false);
    setEditingEquipId(undefined);
  };

  const startEditEquipment = (eq: EquipmentRecord) => {
    setEditingEquipId(eq.id);
    setEquipForm({
      extinguisherType: eq.extinguisherType,
      capacity: eq.capacity || '',
      quantity: eq.quantity,
      description: eq.description,
      lastServiceDate: eq.lastServiceDate || '',
      nextDueDate: eq.nextDueDate || '',
      notes: eq.notes,
    });
    setShowEquipForm(true);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Tela 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-[#116b59] font-bold">
            TELA 2 DE 3 • IMPORTAÇÃO DE PLANILHAS E CARTEIRA DE CLIENTES
          </span>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">
            Assistente de Importação (.CSV / .XLSX) e Carteira
          </h1>
          <p className="text-xs text-slate-600">
            Importe seus controles atuais sem modelo rígido, associe colunas, revise pendências e consulte a ficha de cada cliente.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setWizardOpen(!wizardOpen)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer"
          >
            {wizardOpen ? 'Recolher Assistente de Importação' : 'Abrir Assistente de Importação'}
          </button>
          <button
            type="button"
            onClick={onExportCompanyData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0c373e] hover:bg-[#0d5148] text-white text-xs font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar Meus Dados
          </button>
        </div>
      </div>

      {importResultBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-xs sm:text-sm text-emerald-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{importResultBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportResultBanner(null)}
            className="text-xs underline font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* BLOCO 1: ASSISTENTE DE IMPORTAÇÃO DE PLANILHAS (Seção 3.B) */}
      {wizardOpen && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-red-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Assistente de Importação de Planilhas (Passo {wizardStep} de 3)
                </h2>
                <p className="text-xs text-slate-500">
                  O sistema nunca inventa datas ausentes: registros sem data ou dados técnicos são marcados como "Necessita conferência".
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span
                className={`px-2.5 py-1 rounded-full font-bold ${
                  wizardStep === 1 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                1. Arquivo
              </span>
              <span
                className={`px-2.5 py-1 rounded-full font-bold ${
                  wizardStep === 2 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                2. Colunas
              </span>
              <span
                className={`px-2.5 py-1 rounded-full font-bold ${
                  wizardStep === 3 ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                3. Prévia & Revisão
              </span>
            </div>
          </div>

          {importError && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2 font-medium"
            >
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* PASSO 1: UPLOAD DE ARQUIVO CSV OU XLSX */}
          {wizardStep === 1 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {isDemoMode ? (
                <div
                  data-testid="demo-real-upload-lock"
                  className="lg:col-span-7 border-2 border-amber-300 rounded-2xl p-6 bg-amber-50/70 space-y-3"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-mono text-[11px] font-bold">
                        PROTEÇÃO CONTRA ENVIO ACIDENTAL DE DADOS REAIS
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Upload de planilhas externas bloqueado na Demonstração Pública
                      </h3>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Para garantir que nenhuma oficina envie sua carteira real de clientes acidentalmente neste ambiente público de testes (<code className="font-mono">/?demo=1</code>), o seletor de arquivos do computador fica desativado aqui.
                      </p>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Use o botão ao lado (<strong>"Carregar Planilha de Exemplo no Assistente"</strong>) para testar os 3 passos reais da importação com dados fictícios, ou solicite sua conta isolada por RLS no Piloto de 30 dias.
                      </p>
                    </div>
                  </div>
                  {onOpenCommercialLeadModal && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => onOpenCommercialLeadModal('solicitar_demonstracao')}
                        className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                      >
                        Solicitar demonstração
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenCommercialLeadModal('quero_participar_piloto')}
                        className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
                      >
                        Quero participar do piloto →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="lg:col-span-7 border-2 border-dashed border-slate-300 hover:border-red-500 rounded-2xl p-6 text-center bg-slate-50/60 transition-colors space-y-3">
                  <Upload className="w-8 h-8 text-red-600 mx-auto" />
                  <div>
                    <label
                      htmlFor="spreadsheet-file-input"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-bold cursor-pointer shadow-sm"
                    >
                      Selecionar Planilha (.CSV ou .XLSX)
                    </label>
                    <input
                      id="spreadsheet-file-input"
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Aceita arquivos Excel (.xlsx) e CSV (.csv) de até 5 MB e até 2.000 registros por lote.
                  </p>
                </div>
              )}

              <div className="lg:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Quer testar a importação agora mesmo?
                </h3>
                <p className="text-xs text-slate-600">
                  Carregue uma planilha fictícia de exemplo contendo condomínios, indústrias, escolas e registros incompletos para ver o mapeamento e a revisão em ação:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLoadSampleSpreadsheet}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Carregar Planilha de Exemplo no Assistente →
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Baixar Modelo CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PASSO 2: ASSOCIAÇÃO DE COLUNAS */}
          {wizardStep === 2 && rawSheet && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  Arquivo lido: <strong>{rawSheet.fileName}</strong> ({rawSheet.rows.length} linhas detectadas)
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Trocar arquivo
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { key: 'clientName', label: 'Nome do Cliente *' },
                  { key: 'organizationName', label: 'Empresa ou Condomínio' },
                  { key: 'contactName', label: 'Contato Comercial (Síndico/Comprador)' },
                  { key: 'contactPhone', label: 'Telefone / WhatsApp' },
                  { key: 'contactEmail', label: 'E-mail Comercial' },
                  { key: 'city', label: 'Cidade / UF' },
                  { key: 'equipmentDescription', label: 'Equipamentos / Localização' },
                  { key: 'extinguisherType', label: 'Tipo do Extintor (PQS, Água, CO2...)' },
                  { key: 'capacity', label: 'Capacidade (ex: 4kg, 6kg, 10L)' },
                  { key: 'quantity', label: 'Quantidade' },
                  { key: 'lastServiceDate', label: 'Data do Último Serviço' },
                  {
                    key: 'nextDueDate',
                    label: 'Próximo Acompanhamento / Vencimento Informado',
                  },
                  { key: 'notes', label: 'Observações' },
                ].map((field) => (
                  <div key={field.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {field.label}
                    </label>
                    <select
                      value={mapping[field.key as keyof SpreadsheetColumnMapping]}
                      onChange={(e) =>
                        setMapping({
                          ...mapping,
                          [field.key]: e.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800"
                    >
                      <option value="">-- Não presente na planilha --</option>
                      {rawSheet.headers.map((h) => (
                        <option key={h} value={h}>
                          Coluna: {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(1)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleProceedToPreview}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Gerar Prévia e Validar Registros →
                </button>
              </div>
            </div>
          )}

          {/* PASSO 3: PRÉVIA EDITÁVEL, DUPLICATAS E MARCAÇÃO DE CONFERÊNCIA */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    Total na prévia: <strong>{previewRows.length}</strong>
                  </span>
                  <span className="text-emerald-700 font-semibold">
                    Selecionados para importar: {previewRows.filter((r) => r.selected).length}
                  </span>
                  <span className="text-purple-800 font-semibold">
                    Marcados "Necessita conferência":{' '}
                    {previewRows.filter((r) => r.needsReview).length}
                  </span>
                  <span className="text-amber-800 font-semibold">
                    Duplicatas detectadas: {previewRows.filter((r) => r.isDuplicate).length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
                >
                  Ajustar mapeamento de colunas
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white">
                      <th className="p-2.5">Imp.</th>
                      <th className="p-2.5">Cliente / Condomínio</th>
                      <th className="p-2.5">Tipo Extintor</th>
                      <th className="p-2.5">Cap.</th>
                      <th className="p-2.5">Qtd</th>
                      <th className="p-2.5">Último Serviço</th>
                      <th className="p-2.5">Próx. Acompanhamento</th>
                      <th className="p-2.5">Situação da Validação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {previewRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={
                          row.isDuplicate
                            ? 'bg-amber-50/60'
                            : row.needsReview
                            ? 'bg-purple-50/40'
                            : 'bg-white'
                        }
                      >
                        <td className="p-2.5">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                selected: e.target.checked,
                              })
                            }
                            aria-label={`Selecionar linha ${row.rowIndex}`}
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.clientName}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                clientName: e.target.value,
                              })
                            }
                            className="w-44 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.extinguisherType}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                extinguisherType: e.target.value,
                              })
                            }
                            className="w-28 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={row.capacity || ''}
                            placeholder="Ex: 4kg"
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                capacity: e.target.value || null,
                              })
                            }
                            className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="number"
                            min={1}
                            value={row.quantity}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                quantity: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="w-14 rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={row.lastServiceDate || ''}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                lastServiceDate: e.target.value || null,
                              })
                            }
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <input
                            type="date"
                            value={row.nextDueDate || ''}
                            onChange={(e) =>
                              handleUpdatePreviewRow(row.rowIndex, {
                                nextDueDate: e.target.value || null,
                              })
                            }
                            className="rounded border border-slate-300 px-2 py-1 text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          {row.isDuplicate && (
                            <span className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-950 font-semibold mb-1">
                              Duplicata: {row.duplicateReason}
                            </span>
                          )}
                          {row.needsReview ? (
                            <div className="text-purple-900 font-medium">
                              <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-950 font-bold mr-1">
                                Necessita conferência
                              </span>
                              <span>{row.reviewReasons.join('; ')}</span>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                              ✓ Dados completos
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setWizardStep(2)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white cursor-pointer"
                >
                  Confirmar e Importar {previewRows.filter((r) => r.selected).length} Registros
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BLOCO 2: CARTEIRA DE CLIENTES E FICHA DETALHADA (Seção 3.D) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista Lateral de Clientes */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Carteira de Clientes ({clients.length})
            </h2>
            <button
              type="button"
              onClick={() => setShowNewClientForm(!showNewClientForm)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Cliente
            </button>
          </div>

          {showNewClientForm && (
            <form
              onSubmit={handleCreateManualClient}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs"
            >
              <div className="font-bold text-slate-800">Cadastrar Novo Cliente Manualmente</div>
              <input
                type="text"
                required
                placeholder="Nome do Cliente / Condomínio *"
                value={newClientForm.name}
                onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Responsável / Síndico"
                  value={newClientForm.contactName}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, contactName: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
                <input
                  type="text"
                  placeholder="Telefone / WhatsApp"
                  value={newClientForm.contactPhone}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, contactPhone: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="email"
                  placeholder="E-mail Comercial"
                  value={newClientForm.contactEmail}
                  onChange={(e) =>
                    setNewClientForm({ ...newClientForm, contactEmail: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
                <input
                  type="text"
                  placeholder="Cidade / UF"
                  value={newClientForm.city}
                  onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 bg-white"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewClientForm(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-red-600 text-white font-bold cursor-pointer"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          )}

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filtrar carteira..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs"
            />
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const isSelected = activeClient?.id === client.id;
              const clientEquips = equipments.filter((e) => e.clientId === client.id);
              const units = clientEquips.reduce((s, e) => s + e.quantity, 0);
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => onSelectPortfolioClient(client.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-red-50/70 border-red-500 ring-1 ring-red-500'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-bold text-sm text-slate-900">{client.name}</div>
                    {client.needsReview && (
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[10px] font-bold shrink-0">
                        Conferir
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    {client.contactName || 'Sem contato'} • {client.city || 'Sem cidade'}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                    <span>{units} equip. registrados</span>
                    <span className="font-semibold text-slate-700">
                      {OPPORTUNITY_STAGE_LABELS[client.opportunityStage]}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ficha Detalhada do Cliente Selecionado */}
        <div className="lg:col-span-7 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
          {!activeClient ? (
            <div className="p-8 text-center text-slate-500 text-sm">
              Selecione ou importe um cliente para visualizar sua ficha completa.
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-xs font-semibold">
                      {OPPORTUNITY_STAGE_LABELS[activeClient.opportunityStage]}
                    </span>
                    {activeClient.needsReview && (
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold">
                        Necessita conferência
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">
                    {activeClient.name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Organização/Condomínio: <strong>{activeClient.organizationName}</strong> • Cidade:{' '}
                    <strong>{activeClient.city || 'Não informada'}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenClientInScreen3(activeClient.id)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                >
                  <span>Abrir Funil & Gerar Proposta PDF</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Informações Comerciais */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Contato Comercial:</span>
                  <strong className="text-slate-900 text-sm">
                    {activeClient.contactName || 'Não informado'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Telefone / WhatsApp:</span>
                  <strong className="text-slate-900 text-sm">
                    {activeClient.contactPhone || 'Não informado'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mail:</span>
                  <strong className="text-slate-900 text-sm break-all">
                    {activeClient.contactEmail || 'Não informado'}
                  </strong>
                </div>
                {activeClient.notes && (
                  <div className="sm:col-span-3 pt-2 border-t border-slate-200">
                    <span className="text-slate-500">Observações da Ficha: </span>
                    <span className="text-slate-800">{activeClient.notes}</span>
                  </div>
                )}
              </div>

              {/* Equipamentos Registrados e Revisão */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-red-600" />
                    Equipamentos e Datas Registradas
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingEquipId(undefined);
                      setEquipForm({
                        extinguisherType: 'PQS ABC',
                        capacity: '4kg',
                        quantity: 1,
                        description: '',
                        lastServiceDate: '',
                        nextDueDate: '',
                        notes: '',
                      });
                      setShowEquipForm(!showEquipForm);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Equipamento
                  </button>
                </div>

                {showEquipForm && (
                  <form
                    onSubmit={handleEquipmentSubmit}
                    className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-3 text-xs"
                  >
                    <div className="font-bold text-slate-900">
                      {editingEquipId
                        ? 'Revisar / Editar Lote de Equipamentos'
                        : 'Novo Lote de Equipamentos'}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Tipo do Extintor *
                        </label>
                        <select
                          value={equipForm.extinguisherType}
                          onChange={(e) =>
                            setEquipForm({ ...equipForm, extinguisherType: e.target.value })
                          }
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white"
                        >
                          <option value="PQS ABC">PQS ABC</option>
                          <option value="PQS BC">PQS BC</option>
                          <option value="Água Pressurizada">Água Pressurizada (AP)</option>
                          <option value="CO2">Dióxido de Carbono (CO2)</option>
                          <option value="Espuma Mecânica">Espuma Mecânica</option>
                          <option value="Agente K">Classe K</option>
                          <option value="Não informado">Não informado (Conferir)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Capacidade
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 4kg, 6kg, 10L"
                          value={equipForm.capacity}
                          onChange={(e) =>
                            setEquipForm({ ...equipForm, capacity: e.target.value })
                          }
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Quantidade *
                        </label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={equipForm.quantity}
                          onChange={(e) =>
                            setEquipForm({
                              ...equipForm,
                              quantity: Math.max(1, Number(e.target.value) || 1),
                            })
                          }
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Data do Último Serviço
                        </label>
                        <input
                          type="date"
                          value={equipForm.lastServiceDate}
                          onChange={(e) =>
                            setEquipForm({ ...equipForm, lastServiceDate: e.target.value })
                          }
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">
                          Data do Próximo Acompanhamento / Vencimento
                        </label>
                        <input
                          type="date"
                          value={equipForm.nextDueDate}
                          onChange={(e) =>
                            setEquipForm({ ...equipForm, nextDueDate: e.target.value })
                          }
                          className="w-full rounded border border-slate-300 px-2.5 py-1.5 bg-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowEquipForm(false)}
                        className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded bg-red-600 text-white font-bold cursor-pointer"
                      >
                        Salvar Equipamento
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2">
                  {equipments
                    .filter((e) => e.clientId === activeClient.id)
                    .map((eq) => (
                      <div
                        key={eq.id}
                        className="p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {eq.quantity}x {eq.extinguisherType}{' '}
                              {eq.capacity ? `(${eq.capacity})` : ''}
                            </span>
                            {eq.needsReview && (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-bold">
                                Necessita conferência
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600">
                            Último serviço: <strong>{formatIsoDateBr(eq.lastServiceDate)}</strong> •
                            Próximo acompanhamento:{' '}
                            <strong className="text-slate-900">
                              {formatIsoDateBr(eq.nextDueDate)}
                            </strong>
                          </div>
                          {eq.reviewNotes && (
                            <div className="text-purple-800">{eq.reviewNotes}</div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => startEditEquipment(eq)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold shrink-0 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Revisar / Editar
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Histórico de Serviços e Propostas Emitidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" />
                    Histórico de Serviços
                  </h4>
                  {serviceHistory.filter((s) => s.clientId === activeClient.id).length === 0 ? (
                    <p className="text-xs text-slate-400">Nenhum histórico anterior registrado.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {serviceHistory
                        .filter((s) => s.clientId === activeClient.id)
                        .map((srv) => (
                          <div
                            key={srv.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                          >
                            <div className="font-semibold text-slate-800">
                              {formatIsoDateBr(srv.serviceDate)}
                            </div>
                            <div className="text-slate-600">{srv.description}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Propostas Comerciais
                  </h4>
                  {proposals.filter((p) => p.clientId === activeClient.id).length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Nenhuma proposta gerada para este cliente ainda.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {proposals
                        .filter((p) => p.clientId === activeClient.id)
                        .map((prop) => (
                          <div
                            key={prop.id}
                            className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-slate-900">{prop.proposalNumber}</div>
                              <div className="text-slate-600">
                                {formatCurrencyBrl(prop.totalBrl)} • Status: {prop.status}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onOpenClientInScreen3(activeClient.id)}
                              className="text-red-600 font-bold hover:underline cursor-pointer"
                            >
                              Abrir →
                            </button>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
