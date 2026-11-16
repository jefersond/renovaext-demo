import * as XLSX from 'xlsx';
import { ParsedImportRow, SpreadsheetColumnMapping } from '../types/domain';

export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMPORT_ROWS = 2000;

export interface RawSpreadsheetData {
  fileName: string;
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Normaliza texto para comparação de cabeçalhos e chaves de deduplicação.
 */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Gera impressão digital determinística para evitar duplicatas na importação.
 */
export function buildDedupeFingerprint(input: {
  clientName: string;
  organizationName?: string;
  extinguisherType: string;
  capacity?: string | null;
  nextDueDate?: string | null;
  lastServiceDate?: string | null;
}): string {
  const clientKey = normalizeText(input.organizationName || input.clientName);
  const typeKey = normalizeText(input.extinguisherType || 'nao_informado');
  const capKey = normalizeText(input.capacity || '');
  const dueKey = normalizeText(input.nextDueDate || input.lastServiceDate || 'sem_data');
  return `${clientKey}|${typeKey}|${capKey}|${dueKey}`;
}

/**
 * Converte datas em formatos comuns brasileiros (DD/MM/YYYY, DD-MM-YYYY),
 * ISO (YYYY-MM-DD) ou número serial do Excel em YYYY-MM-DD validado.
 * NUNCA inventa datas se o valor estiver vazio ou inválido.
 */
export function parseStrictDate(raw: unknown): {
  isoDate: string | null;
  isInvalidFormat: boolean;
} {
  if (raw === null || raw === undefined) {
    return { isoDate: null, isInvalidFormat: false };
  }
  const str = String(raw).trim();
  if (!str || str === '-' || normalizeText(str) === 'n/a' || normalizeText(str) === 'sem data') {
    return { isoDate: null, isInvalidFormat: false };
  }

  // Número serial do Excel (ex: 46000)
  if (/^\d{5}$/.test(str)) {
    const serial = parseInt(str, 10);
    if (serial > 25000 && serial < 65000) {
      const utcDays = serial - 25569;
      const dateObj = new Date(utcDays * 86400 * 1000);
      if (!Number.isNaN(dateObj.getTime())) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return { isoDate: `${y}-${m}-${d}`, isInvalidFormat: false };
      }
    }
  }

  // Formato ISO YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (isValidCalendarDate(year, month, day)) {
      return {
        isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isInvalidFormat: false,
      };
    }
    return { isoDate: null, isInvalidFormat: true };
  }

  // Formato Brasileiro DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const brMatch = str.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})$/);
  if (brMatch) {
    const day = parseInt(brMatch[1], 10);
    const month = parseInt(brMatch[2], 10);
    let year = parseInt(brMatch[3], 10);
    if (year < 100) {
      year += 2000;
    }
    if (isValidCalendarDate(year, month, day)) {
      return {
        isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isInvalidFormat: false,
      };
    }
    return { isoDate: null, isInvalidFormat: true };
  }

  return { isoDate: null, isInvalidFormat: true };
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1990 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

/**
 * Sugere automaticamente o mapeamento das colunas da planilha do usuário.
 */
export function suggestColumnMapping(headers: string[]): SpreadsheetColumnMapping {
  const findHeader = (keywords: string[]): string => {
    for (const kw of keywords) {
      const match = headers.find((h) => normalizeText(h) === kw);
      if (match) return match;
    }
    for (const kw of keywords) {
      const match = headers.find((h) => normalizeText(h).includes(kw));
      if (match) return match;
    }
    return '';
  };

  return {
    clientName: findHeader(['cliente', 'nome do cliente', 'razao social', 'nome', 'contratante']),
    organizationName: findHeader(['condominio', 'empresa', 'organizacao', 'nome fantasia', 'edificio', 'local']),
    contactName: findHeader(['contato', 'contato comercial', 'responsavel', 'sindico', 'comprador', 'decisor']),
    contactPhone: findHeader(['telefone', 'whatsapp', 'celular', 'fone', 'tel']),
    contactEmail: findHeader(['email', 'e-mail', 'correio']),
    city: findHeader(['cidade', 'municipio', 'uf', 'localidade']),
    equipmentDescription: findHeader(['equipamento', 'equipamentos', 'descricao', 'inventario', 'itens']),
    extinguisherType: findHeader(['tipo', 'tipo do extintor', 'agente', 'carga', 'classe']),
    capacity: findHeader(['capacidade', 'peso', 'volume', 'kg', 'litros']),
    quantity: findHeader(['quantidade', 'qtd', 'qtde', 'cilindros', 'unidades']),
    lastServiceDate: findHeader(['ultimo servico', 'data do ultimo servico', 'ultima recarga', 'data recarga', 'execucao']),
    nextDueDate: findHeader([
      'proximo acompanhamento',
      'vencimento',
      'data de vencimento',
      'proxima manutencao',
      'retorno',
      'validade',
    ]),
    notes: findHeader(['observacoes', 'obs', 'notas', 'detalhes', 'historico']),
  };
}

/**
 * Parser CSV RFC-4180 determinístico em UTF-8 (preserva acentuação e evita
 * conversão involuntária de datas para o padrão americano M/D/YY).
 */
function parseCsvTextToMatrix(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, '');
  const firstLine = cleanText.split(/\r?\n/)[0] || '';
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const ch = cleanText[i];
    const next = cleanText[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\r' && next === '\n') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        i++;
      } else if (ch === '\n' || ch === '\r') {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    rows.push(currentRow);
  }

  return rows.filter((r) => r.some((cell) => cell !== ''));
}

/**
 * Lê um arquivo CSV ou XLSX a partir de um ArrayBuffer,
 * validando limites de tamanho e quantidade de linhas.
 */
export function parseSpreadsheetBuffer(
  buffer: ArrayBuffer,
  fileName: string
): RawSpreadsheetData {
  if (buffer.byteLength === 0) {
    throw new Error('O arquivo selecionado está vazio.');
  }
  if (buffer.byteLength > MAX_IMPORT_FILE_BYTES) {
    throw new Error(
      `O arquivo excede o limite de segurança de 5 MB (${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB).`
    );
  }

  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    throw new Error('Formato de arquivo inválido. Envie uma planilha .CSV ou .XLSX.');
  }

  let jsonMatrix: (string | number | Date | null)[][];

  if (ext === 'csv') {
    const csvString = new TextDecoder('utf-8').decode(buffer);
    jsonMatrix = parseCsvTextToMatrix(csvString);
  } else {
    const workbook = XLSX.read(new Uint8Array(buffer), {
      type: 'array',
      cellDates: true,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('Nenhuma aba encontrada na planilha.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    jsonMatrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
      dateNF: 'yyyy-mm-dd',
    });
  }

  if (jsonMatrix.length < 2) {
    throw new Error('A planilha precisa conter pelo menos a linha de cabeçalho e 1 linha de dados.');
  }

  const rawHeaders = (jsonMatrix[0] || []).map((cell, idx) => {
    const clean = String(cell ?? '').trim();
    return clean || `Coluna_${idx + 1}`;
  });

  const dataRows = jsonMatrix.slice(1);
  if (dataRows.length > MAX_IMPORT_ROWS) {
    throw new Error(
      `A planilha possui ${dataRows.length} linhas, acima do limite operacional de ${MAX_IMPORT_ROWS} registros por importação.`
    );
  }

  const structuredRows: Record<string, string>[] = [];
  for (const row of dataRows) {
    const record: Record<string, string> = {};
    let hasContent = false;
    rawHeaders.forEach((header, colIdx) => {
      const rawCell = row[colIdx];
      let val = '';
      if (rawCell instanceof Date && !Number.isNaN(rawCell.getTime())) {
        val = rawCell.toISOString().slice(0, 10);
      } else {
        val = String(rawCell ?? '').trim();
      }
      if (val) hasContent = true;
      record[header] = val;
    });
    if (hasContent) {
      structuredRows.push(record);
    }
  }

  if (structuredRows.length === 0) {
    throw new Error('Nenhum registro preenchido foi encontrado após o cabeçalho.');
  }

  return {
    fileName,
    headers: rawHeaders,
    rows: structuredRows,
  };
}

/**
 * Aplica o mapeamento de colunas às linhas brutas da planilha e realiza a validação
 * técnica e comercial:
 * - NÃO inventa datas ausentes.
 * - Marca como "necessita conferência" (needsReview = true) quando dados técnicos ou datas estão incompletos/inválidos.
 * - Detecta duplicatas contra a carteira existente e dentro do próprio lote.
 */
export function buildImportPreviewRows(
  rawRows: Record<string, string>[],
  mapping: SpreadsheetColumnMapping,
  existingFingerprints: Set<string>
): ParsedImportRow[] {
  const seenInBatch = new Set<string>();

  return rawRows.map((row, idx) => {
    const getVal = (mappedCol: string) => (mappedCol && row[mappedCol] ? row[mappedCol].trim() : '');

    const rawClientName = getVal(mapping.clientName);
    const rawOrgName = getVal(mapping.organizationName);
    const clientName = rawClientName || rawOrgName || `Registro Sem Nome #${idx + 1}`;
    const organizationName = rawOrgName || rawClientName || clientName;

    const contactName = getVal(mapping.contactName);
    const contactPhone = getVal(mapping.contactPhone);
    const contactEmail = getVal(mapping.contactEmail);
    const city = getVal(mapping.city);
    const equipmentDescription = getVal(mapping.equipmentDescription);
    const rawType = getVal(mapping.extinguisherType);
    const rawCapacity = getVal(mapping.capacity);
    const rawQty = getVal(mapping.quantity);
    const rawLastService = getVal(mapping.lastServiceDate);
    const rawNextDue = getVal(mapping.nextDueDate);
    const notes = getVal(mapping.notes);

    const reviewReasons: string[] = [];

    if (!rawClientName && !rawOrgName) {
      reviewReasons.push('Nome do cliente/condomínio ausente na planilha');
    }

    // Validação do tipo de extintor / equipamento
    const extinguisherType = rawType || (equipmentDescription ? 'Conforme descrição' : 'Não informado');
    if (!rawType && !equipmentDescription) {
      reviewReasons.push('Tipo de extintor / equipamento não informado — necessita conferência');
    }

    // Validação de quantidade
    let quantity = 1;
    if (rawQty) {
      const parsedNum = parseInt(rawQty.replace(/[^\d-]/g, ''), 10);
      if (Number.isNaN(parsedNum) || parsedNum <= 0) {
        reviewReasons.push(`Quantidade inválida ("${rawQty}") — ajustada para 1 para conferência`);
        quantity = 1;
      } else {
        quantity = parsedNum;
      }
    } else {
      reviewReasons.push('Quantidade não informada — necessita conferência');
    }

    // Validação de datas (NUNCA inventar datas ausentes!)
    const lastServiceParsed = parseStrictDate(rawLastService);
    if (lastServiceParsed.isInvalidFormat) {
      reviewReasons.push(`Data do último serviço inválida ("${rawLastService}")`);
    }

    const nextDueParsed = parseStrictDate(rawNextDue);
    if (nextDueParsed.isInvalidFormat) {
      reviewReasons.push(`Data de próximo acompanhamento inválida ("${rawNextDue}")`);
    } else if (!nextDueParsed.isoDate) {
      reviewReasons.push('Data de próximo acompanhamento/vencimento não informada — necessita conferência');
    }

    const dedupeFingerprint = buildDedupeFingerprint({
      clientName,
      organizationName,
      extinguisherType,
      capacity: rawCapacity || null,
      nextDueDate: nextDueParsed.isoDate,
      lastServiceDate: lastServiceParsed.isoDate,
    });

    let isDuplicate = false;
    let duplicateReason: string | null = null;

    if (existingFingerprints.has(dedupeFingerprint)) {
      isDuplicate = true;
      duplicateReason = 'Registro idêntico já cadastrado na carteira da empresa';
    } else if (seenInBatch.has(dedupeFingerprint)) {
      isDuplicate = true;
      duplicateReason = 'Linha duplicada dentro da própria planilha importada';
    }
    seenInBatch.add(dedupeFingerprint);

    const needsReview = reviewReasons.length > 0;

    return {
      rowIndex: idx + 1,
      selected: !isDuplicate,
      clientName,
      organizationName,
      contactName,
      contactPhone,
      contactEmail,
      city,
      equipmentDescription: equipmentDescription || `${quantity}x ${extinguisherType}${rawCapacity ? ' ' + rawCapacity : ''}`,
      extinguisherType,
      capacity: rawCapacity || null,
      quantity,
      lastServiceDate: lastServiceParsed.isoDate,
      nextDueDate: nextDueParsed.isoDate,
      notes,
      needsReview,
      reviewReasons,
      isDuplicate,
      duplicateReason,
      dedupeFingerprint,
    };
  });
}

/**
 * Gera planilha CSV de exemplo realista (com dados 100% fictícios, incluindo casos
 * completos, próximos do vencimento, atrasados e dados incompletos para conferência).
 */
export function generateSampleSpreadsheetCsv(referenceDateIso?: string): string {
  const baseDate = referenceDateIso ? new Date(`${referenceDateIso}T12:00:00Z`) : new Date();
  const addDaysIso = (days: number): string => {
    const dt = new Date(baseDate.getTime() + days * 86400 * 1000);
    return dt.toISOString().slice(0, 10);
  };

  const rows = [
    [
      'Nome do Cliente',
      'Condomínio ou Empresa',
      'Contato Comercial',
      'Telefone',
      'Email',
      'Cidade',
      'Equipamentos',
      'Tipo do Extintor',
      'Capacidade',
      'Quantidade',
      'Data do Último Serviço',
      'Próximo Acompanhamento',
      'Observações',
    ],
    [
      'Condomínio Edifício Atlântico (Fictício)',
      'Condomínio Edifício Atlântico',
      'Sr. Roberto (Síndico)',
      '(11) 98811-2233',
      'sindico@atlantico-ficticio.com.br',
      'São Paulo/SP',
      'Lote Torre A e Garagem',
      'PQS ABC',
      '4kg',
      '18',
      addDaysIso(-350),
      addDaysIso(15),
      'Pede colocação de extintores reserva na retirada.',
    ],
    [
      'Metalúrgica Precisão LTDA (Fictício)',
      'Metalúrgica Precisão',
      'Juliana (Compras / SESMT)',
      '(11) 97722-3344',
      'compras@metalprecisao-ficticio.com.br',
      'Guarulhos/SP',
      'Galpão Usinagem',
      'CO2',
      '6kg',
      '8',
      addDaysIso(-380),
      addDaysIso(-12),
      'Acompanhamento atrasado. Verificar pesagem semestral e manutenção.',
    ],
    [
      'Colégio Horizonte Saber (Fictício)',
      'Colégio Horizonte',
      'Prof. Marcos (Diretor)',
      '(19) 99123-4455',
      'adm@colegiohorizonte-ficticio.com.br',
      'Campinas/SP',
      'Bloco Pedagógico',
      'Água Pressurizada',
      '10L',
      '12',
      addDaysIso(-320),
      addDaysIso(45),
      'Prefere atendimento durante recesso escolar.',
    ],
    [
      'Supermercado Bom Preço Matriz (Fictício)',
      'Supermercado Bom Preço',
      'Carlos Eduardo (Gerente)',
      '(41) 98877-6655',
      'gerencia@bompreco-ficticio.com.br',
      'Curitiba/PR',
      'Área de Vendas e Depósito',
      'PQS BC',
      '6kg',
      '14',
      addDaysIso(-290),
      addDaysIso(75),
      'Janela de 90 dias para cotação anual.',
    ],
    [
      'Clínica Médica Santa Clara (Fictício)',
      'Clínica Santa Clara',
      'Dra. Helena',
      '(31) 99333-1122',
      'contato@santaclara-ficticio.com.br',
      'Belo Horizonte/MG',
      'Recepção e Consultórios',
      '',
      '',
      '6',
      addDaysIso(-340),
      '',
      'Ficha antiga sem data de próximo acompanhamento e sem tipo especificado.',
    ],
  ];

  return rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}
