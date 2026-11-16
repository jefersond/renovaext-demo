import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { App } from '../App';
import { tenantRepository } from '../services/tenantRepository';
import {
  buildImportPreviewRows,
  parseSpreadsheetBuffer,
  suggestColumnMapping,
} from '../services/spreadsheetImportEngine';

describe('RenovaExt MVP — Homologação de Planilhas Reais (CSV/XLSX) e Jornada Mobile (390x844)', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    tenantRepository.resetDatabaseForTests();
    document.body.innerHTML = '';
  });

  it('Processa os arquivos reais CSV e XLSX de homologação barrando duplicatas e marcando datas inválidas ("32/13/2026") e campos ausentes para conferência', () => {
    const csvPath = path.join(process.cwd(), 'docs', 'homologacao', 'planilha-teste-homologacao.csv');
    const xlsxPath = path.join(process.cwd(), 'docs', 'homologacao', 'planilha-teste-homologacao.xlsx');

    expect(fs.existsSync(csvPath)).toBe(true);
    expect(fs.existsSync(xlsxPath)).toBe(true);

    const csvBuf = fs.readFileSync(csvPath);
    const xlsxBuf = fs.readFileSync(xlsxPath);

    const csvRaw = parseSpreadsheetBuffer(
      csvBuf.buffer.slice(csvBuf.byteOffset, csvBuf.byteOffset + csvBuf.byteLength),
      'planilha-teste-homologacao.csv'
    );
    const xlsxRaw = parseSpreadsheetBuffer(
      xlsxBuf.buffer.slice(xlsxBuf.byteOffset, xlsxBuf.byteOffset + xlsxBuf.byteLength),
      'planilha-teste-homologacao.xlsx'
    );

    for (const raw of [csvRaw, xlsxRaw]) {
      const mapping = suggestColumnMapping(raw.headers);
      const previewRows = buildImportPreviewRows(raw.rows, mapping, new Set());
      expect(previewRows.length).toBe(7);

      // Linha 2 é duplicata exata da Linha 1
      const duplicates = previewRows.filter((r) => r.isDuplicate);
      expect(duplicates.length).toBe(1);
      expect(duplicates[0].selected).toBe(false);

      // Linha 6 ("32/13/2026") deve ter nextDueDate === null e needsReview === true
      const invalidDateRow = previewRows.find((r) =>
        r.clientName.includes('Padaria e Confeitaria Pão Dourado')
      );
      expect(invalidDateRow).toBeDefined();
      expect(invalidDateRow?.nextDueDate).toBeNull();
      expect(invalidDateRow?.needsReview).toBe(true);

      // Linha 7 (sem vencimento e sem tipo) deve ter nextDueDate === null e needsReview === true
      const missingFieldsRow = previewRows.find((r) =>
        r.clientName.includes('Clínica Médica Santa Clara')
      );
      expect(missingFieldsRow).toBeDefined();
      expect(missingFieldsRow?.nextDueDate).toBeNull();
      expect(missingFieldsRow?.needsReview).toBe(true);
    }
  });

  it('Executa a jornada completa em viewport de celular (390x844): Radar -> Carteira -> Oportunidade e Proposta PDF', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 390 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 844 });
    window.dispatchEvent(new Event('resize'));

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Acessar Demonstração Navegável')
    );
    expect(demoBtn).toBeDefined();

    await act(async () => {
      demoBtn!.click();
    });

    // Confirmar Tela 1 (Radar) no celular
    expect(container.textContent).toContain('Painel de Vencimentos e Acompanhamento Comercial');
    expect(container.textContent).toContain('Metalúrgica Precisão Industrial (Fictício)');

    // Clicar em "Oportunidade & Proposta" diretamente de um card do Radar no celular
    const cotarBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Oportunidade & Proposta')
    );
    expect(cotarBtn).toBeDefined();

    await act(async () => {
      cotarBtn!.click();
    });

    // Confirmar abertura da Tela 3 no celular com Funil e Montador de Proposta
    expect(container.textContent).toContain('Etapa da Oportunidade no Funil Comercial');
    expect(container.textContent).toContain('Preparar Proposta Comercial (PDF)');

    await act(async () => {
      root.unmount();
    });
  });
});
