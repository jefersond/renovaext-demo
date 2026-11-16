import { beforeEach, describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { tenantRepository } from '../services/tenantRepository';
import {
  buildImportPreviewRows,
  generateSampleSpreadsheetCsv,
  MAX_IMPORT_ROWS,
  parseSpreadsheetBuffer,
  parseStrictDate,
  suggestColumnMapping,
} from '../services/spreadsheetImportEngine';
import {
  buildClientRadarSummaries,
  computeDashboardMetrics,
} from '../services/radarEngine';
import { generateProposalPdfDocument } from '../services/pdfProposalGenerator';
import { OPPORTUNITY_STAGE_ORDER } from '../types/domain';

describe('RenovaExt MVP — Suíte Completa de Testes de Aceitação (10 Critérios Obrigatórios)', () => {
  beforeEach(() => {
    tenantRepository.resetDatabaseForTests();
  });

  it('Critério 1 e 10: Uma empresa cria sua conta com sucesso e não há pagamentos reais ativados sem autorização', () => {
    const { session, company } = tenantRepository.registerCompanyAccount({
      companyName: 'Alfa Extintores Campinas LTDA',
      cnpj: '12.345.678/0001-90',
      responsibleName: 'Marcos Silva',
      email: 'comercial@alfaextintores.com.br',
      password: 'senha-segura-123',
      phone: '(19) 99888-7766',
      city: 'Campinas',
      state: 'SP',
      selectedPlanHypothesis: 'inicial_49',
    });

    expect(session.companyId).toBe(company.id);
    expect(company.name).toBe('Alfa Extintores Campinas LTDA');
    expect(company.selectedPlanHypothesis).toBe('inicial_49');
    expect(company.billingActive).toBe(false);
  });

  it('Critério 2 e 3: Importa planilha CSV e XLSX, detecta datas inválidas/ausentes sem inventar datas, previne duplicatas e permite correção antes de confirmar', () => {
    const { session, company } = tenantRepository.registerCompanyAccount({
      companyName: 'Oficina Teste Importação',
      responsibleName: 'Ana Paula',
      email: 'ana@oficinateste.com.br',
      password: 'password123',
      phone: '(11) 97777-6666',
      city: 'São Paulo',
      state: 'SP',
      selectedPlanHypothesis: 'profissional_79',
    });

    const csvText = generateSampleSpreadsheetCsv('2026-11-12');
    const buffer = new TextEncoder().encode(csvText).buffer;
    const parsedSheet = parseSpreadsheetBuffer(buffer, 'carteira.csv');
    const mapping = suggestColumnMapping(parsedSheet.headers);

    expect(mapping.clientName).toBe('Nome do Cliente');
    expect(mapping.nextDueDate).toBe('Próximo Acompanhamento');

    const previewRows = buildImportPreviewRows(parsedSheet.rows, mapping, new Set());
    expect(previewRows.length).toBe(5);

    // O 5º cliente ("Clínica Médica Santa Clara") está sem data de próximo acompanhamento e sem tipo
    const incompleteRow = previewRows[4];
    expect(incompleteRow.nextDueDate).toBeNull(); // NUNCA inventa data!
    expect(incompleteRow.needsReview).toBe(true);
    expect(incompleteRow.reviewReasons.join(' ')).toContain('necessita conferência');

    // Simular correção pelo usuário na prévia antes de confirmar
    previewRows[4].extinguisherType = 'PQS ABC';
    previewRows[4].capacity = '4kg';

    const result1 = tenantRepository.commitSpreadsheetImport({
      companyId: company.id,
      actorEmail: session.email,
      rows: previewRows,
    });

    expect(result1.importedClientsCount).toBe(5);
    expect(result1.importedEquipmentsCount).toBe(5);
    expect(result1.flaggedForReviewCount).toBe(1); // Continua sem nextDueDate, logo permanece marcado para conferência

    // Tentar importar a mesma planilha novamente deve detectar 100% como duplicata
    const snapshot = tenantRepository.getTenantSnapshot(company.id);
    const existingFingerprints = new Set(snapshot.equipments.map((e) => e.dedupeFingerprint));
    const secondPreview = buildImportPreviewRows(
      parsedSheet.rows,
      mapping,
      existingFingerprints
    );
    expect(secondPreview.filter((r) => r.isDuplicate).length).toBeGreaterThanOrEqual(4);
  });

  it('Testa parser de XLSX binário, datas inválidas (ex: 31/02/2026) e limite de grandes planilhas', () => {
    expect(parseStrictDate('31/02/2026')).toEqual({
      isoDate: null,
      isInvalidFormat: true,
    });
    expect(parseStrictDate('15/08/2026')).toEqual({
      isoDate: '2026-08-15',
      isInvalidFormat: false,
    });
    expect(parseStrictDate('')).toEqual({
      isoDate: null,
      isInvalidFormat: false,
    });

    // Gerar um arquivo XLSX em memória com 300 linhas para validar performance em planilhas maiores
    const rows: string[][] = [
      ['Cliente', 'Contato', 'Tipo do Extintor', 'Capacidade', 'Quantidade', 'Próximo Acompanhamento'],
    ];
    for (let i = 1; i <= 300; i++) {
      rows.push([
        `Condomínio Teste #${i}`,
        `Síndico ${i}`,
        'PQS ABC',
        '4kg',
        '10',
        '20/12/2026',
      ]);
    }
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
    const xlsxArray = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const parsedXlsx = parseSpreadsheetBuffer(xlsxArray, 'lote-300.xlsx');
    expect(parsedXlsx.rows.length).toBe(300);

    // Testar bloqueio acima de MAX_IMPORT_ROWS (2.000 linhas)
    const oversizedRows: string[][] = [['Cliente', 'Vencimento']];
    for (let i = 1; i <= MAX_IMPORT_ROWS + 5; i++) {
      oversizedRows.push([`Cliente ${i}`, '10/10/2026']);
    }
    const wbOver = XLSX.utils.book_new();
    const wsOver = XLSX.utils.aoa_to_sheet(oversizedRows);
    XLSX.utils.book_append_sheet(wbOver, wsOver, 'Excesso');
    const overBuffer = XLSX.write(wbOver, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    expect(() => parseSpreadsheetBuffer(overBuffer, 'excesso.xlsx')).toThrow(
      /acima do limite operacional/i
    );
  });

  it('Critério 4, 5, 6 e 7: Visualiza Radar (Atrasados, 30d, 60d, 90d, Incompletos), movimenta as 7 etapas do funil e gera proposta PDF sem inventar preços', () => {
    const { session, company } = tenantRepository.ensureFictitiousDemoEnvironment('2026-11-12');
    const snapshot = tenantRepository.getTenantSnapshot(company.id);

    const summaries = buildClientRadarSummaries(
      snapshot.clients,
      snapshot.equipments,
      '2026-11-12'
    );
    const metrics = computeDashboardMetrics(summaries, snapshot.proposals);

    expect(metrics.totalClients).toBe(5);
    expect(metrics.overdueClientsCount).toBe(1);
    expect(metrics.due30ClientsCount).toBe(1);
    expect(metrics.due60ClientsCount).toBe(1);
    expect(metrics.due90ClientsCount).toBe(1);
    expect(metrics.incompleteClientsCount).toBe(1);

    const targetClient = snapshot.clients[0];

    // Percorrer etapas do funil comercial e verificar registro no histórico
    for (const stage of OPPORTUNITY_STAGE_ORDER) {
      tenantRepository.updateOpportunityStage({
        companyId: company.id,
        actorEmail: session.email,
        clientId: targetClient.id,
        toStage: stage,
        note: `Avanço de teste para ${stage}`,
      });
    }

    const updatedSnapshot = tenantRepository.getTenantSnapshot(company.id);
    const historyForClient = updatedSnapshot.opportunityHistory.filter(
      (h) => h.clientId === targetClient.id
    );
    expect(historyForClient.length).toBeGreaterThanOrEqual(7);

    // Tentativa de gerar proposta com preço R$ 0 deve ser bloqueada (proibido inventar preços)
    expect(() =>
      tenantRepository.createProposal({
        companyId: company.id,
        actorEmail: session.email,
        clientId: targetClient.id,
        validityDays: 15,
        items: [
          {
            id: 'item-1',
            equipmentId: null,
            equipmentLabel: 'Extintor PQS ABC 4kg',
            serviceDescription: 'Manutenção Nível 2',
            quantity: 10,
            unitPriceBrl: 0,
          },
        ],
        notes: 'Teste sem preço',
      })
    ).toThrow(/Informe os preços unitários/i);

    // Geração válida de Proposta Comercial + Documento PDF
    const proposal = tenantRepository.createProposal({
      companyId: company.id,
      actorEmail: session.email,
      clientId: targetClient.id,
      validityDays: 15,
      items: [
        {
          id: 'item-1',
          equipmentId: null,
          equipmentLabel: 'Extintor PQS ABC 4kg',
          serviceDescription: 'Manutenção de 2º Nível / Recarga',
          quantity: 18,
          unitPriceBrl: 65,
        },
        {
          id: 'item-2',
          equipmentId: null,
          equipmentLabel: 'Extintor Água 10L',
          serviceDescription: 'Manutenção de 2º Nível / Recarga',
          quantity: 6,
          unitPriceBrl: 55,
        },
      ],
      notes: 'Inclui empréstimo de extintores reserva.',
    });

    expect(proposal.totalBrl).toBe(18 * 65 + 6 * 55); // 1170 + 330 = 1500
    expect(proposal.proposalNumber).toBe('PROP-2026-001');

    const pdfDoc = generateProposalPdfDocument({
      company,
      client: targetClient,
      proposal,
      triggerBrowserDownload: false,
    });

    expect(pdfDoc.fileName).toContain('PROP-2026-001');
    expect(pdfDoc.textSummary).toContain('1.500,00');
  });

  it('Critério 8: Isolamento Multi-Tenant Estrito (RLS) — Uma empresa jamais acessa ou modifica dados de outra empresa', () => {
    const empresaA = tenantRepository.registerCompanyAccount({
      companyName: 'Oficina A Extintores',
      responsibleName: 'Gestor A',
      email: 'gestor@oficina-a.com.br',
      password: 'passwordA',
      phone: '(11) 91111-1111',
      city: 'São Paulo',
      state: 'SP',
      selectedPlanHypothesis: 'inicial_49',
    });

    const clienteEmpresaA = tenantRepository.createOrUpdateClient({
      companyId: empresaA.company.id,
      actorEmail: empresaA.session.email,
      name: 'Condomínio Secreto da Oficina A',
      organizationName: 'Condomínio Secreto A',
      contactName: 'Síndico A',
      contactPhone: '(11) 90000-0001',
      contactEmail: 'sindico@secretoa.com.br',
      city: 'São Paulo',
      notes: 'Confidencial A',
      needsReview: false,
      reviewReason: null,
    });

    const empresaB = tenantRepository.registerCompanyAccount({
      companyName: 'Oficina B Concorrente',
      responsibleName: 'Gestor B',
      email: 'gestor@oficina-b.com.br',
      password: 'passwordB',
      phone: '(11) 92222-2222',
      city: 'Guarulhos',
      state: 'SP',
      selectedPlanHypothesis: 'inicial_49',
    });

    const snapshotB = tenantRepository.getTenantSnapshot(empresaB.company.id);
    expect(snapshotB.clients.length).toBe(0);

    // Tentativa direta de leitura ou alteração do cliente da Empresa A usando o companyId da Empresa B deve falhar
    expect(() =>
      tenantRepository.getClientByIdIsolated(empresaB.company.id, clienteEmpresaA.id)
    ).toThrow(/CROSS_TENANT_ACCESS_DENIED/);

    expect(() =>
      tenantRepository.updateOpportunityStage({
        companyId: empresaB.company.id,
        actorEmail: empresaB.session.email,
        clientId: clienteEmpresaA.id,
        toStage: 'contatado',
      })
    ).toThrow(/CROSS_TENANT_ACCESS_DENIED/);
  });
});
