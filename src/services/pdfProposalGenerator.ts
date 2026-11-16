import { jsPDF } from 'jspdf';
import { Client, Company, Proposal, ProposalItem } from '../types/domain';

export function calculateProposalTotals(items: Omit<ProposalItem, 'subtotalBrl'>[]): {
  itemsWithSubtotal: ProposalItem[];
  totalBrl: number;
} {
  const itemsWithSubtotal: ProposalItem[] = items.map((item) => {
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const unit = Math.max(0, Number(item.unitPriceBrl) || 0);
    const subtotalBrl = Math.round(qty * unit * 100) / 100;
    return {
      ...item,
      quantity: qty,
      unitPriceBrl: unit,
      subtotalBrl,
    };
  });

  const totalBrl =
    Math.round(itemsWithSubtotal.reduce((acc, it) => acc + it.subtotalBrl, 0) * 100) / 100;

  return { itemsWithSubtotal, totalBrl };
}

export function formatCurrencyBrl(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function formatIsoDateBr(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Não informada';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * Gera o documento PDF da Proposta Comercial e inicia o download no navegador.
 * Retorna também o resumo textual e os metadados do PDF gerado para auditoria e testes.
 */
export function generateProposalPdfDocument(params: {
  company: Company;
  client: Client;
  proposal: Proposal;
  triggerBrowserDownload?: boolean;
}): {
  fileName: string;
  pdfInstance: jsPDF;
  textSummary: string;
} {
  const { company, client, proposal, triggerBrowserDownload = true } = params;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const issueDateStr = new Date(proposal.createdAt).toLocaleDateString('pt-BR');
  const validUntilDate = new Date(
    new Date(proposal.createdAt).getTime() + proposal.validityDays * 86400 * 1000
  ).toLocaleDateString('pt-BR');

  // Cabeçalho da Empresa de Extintores (Paleta Oficial RenovaExt: #0c373e e #0d5148)
  doc.setFillColor(12, 55, 62); // #0c373e (Azul-petróleo corporativo)
  doc.rect(0, 0, 210, 36, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(company.name.toUpperCase(), 14, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const cnpjText = company.cnpj ? `CNPJ: ${company.cnpj}  |  ` : '';
  doc.text(
    `${cnpjText}Responsável: ${company.responsibleName}  |  ${company.city}/${company.state}`,
    14,
    22
  );
  doc.text(`Contato: ${company.phone}  |  E-mail: ${company.email}`, 14, 28);

  // Selo do Número da Proposta
  doc.setFillColor(13, 81, 72); // #0d5148 (Verde corporativo RenovaExt)
  doc.roundedRect(145, 9, 51, 18, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(proposal.proposalNumber, 170.5, 16, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Validade: ${proposal.validityDays} dias (${validUntilDate})`, 170.5, 22, {
    align: 'center',
  });

  // Dados do Cliente
  let y = 46;
  doc.setTextColor(19, 45, 51);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PROPOSTA COMERCIAL DE MANUTENÇÃO E INSPEÇÃO DE EXTINTORES', 14, y);

  y += 7;
  doc.setDrawColor(220, 232, 232);
  doc.setFillColor(245, 249, 249);
  doc.roundedRect(14, y, 182, 26, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente / Condomínio:', 18, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(`${client.name} (${client.organizationName || client.name})`, 56, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('Contato Comercial:', 18, y + 14);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${client.contactName || 'A/C Administração'}  |  Tel: ${client.contactPhone || 'Não informado'}`,
    56,
    y + 14
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Cidade / Data Emissão:', 18, y + 21);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${client.city || company.city}  |  Emitida em ${issueDateStr} (Válida até ${validUntilDate})`,
    56,
    y + 21
  );

  // Cabeçalho da Tabela de Itens
  y += 34;
  doc.setFillColor(12, 55, 62);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('EQUIPAMENTO', 17, y + 5.5);
  doc.text('SERVIÇO A COTAR', 72, y + 5.5);
  doc.text('QTD', 135, y + 5.5, { align: 'right' });
  doc.text('UNITÁRIO (R$)', 164, y + 5.5, { align: 'right' });
  doc.text('SUBTOTAL (R$)', 193, y + 5.5, { align: 'right' });

  y += 8;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  for (let i = 0; i < proposal.items.length; i++) {
    const item = proposal.items[i];
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    if (i % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 9, 'F');
    }

    const equipLabel = item.equipmentLabel.slice(0, 30);
    const serviceLabel = item.serviceDescription.slice(0, 36);

    doc.text(equipLabel, 17, y + 6);
    doc.text(serviceLabel, 72, y + 6);
    doc.text(String(item.quantity), 135, y + 6, { align: 'right' });
    doc.text(formatCurrencyBrl(item.unitPriceBrl), 164, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrencyBrl(item.subtotalBrl), 193, y + 6, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 9, 196, y + 9);
    y += 9;
  }

  // Bloco Totalizador (Paleta Oficial RenovaExt: Verde-Esmeralda #0d5148)
  y += 4;
  doc.setFillColor(238, 246, 242);
  doc.setDrawColor(13, 81, 72);
  doc.roundedRect(120, y, 76, 12, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(12, 55, 62);
  doc.text('TOTAL DA PROPOSTA:', 124, y + 7.5);
  doc.setFontSize(11);
  doc.setTextColor(13, 81, 72);
  doc.text(formatCurrencyBrl(proposal.totalBrl), 193, y + 7.5, { align: 'right' });

  // Observações Comerciais
  y += 20;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('Observações e Condições Comerciais:', 14, y);

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const splitNotes = doc.splitTextToSize(
    proposal.notes || company.defaultProposalNotes || 'Condições conforme negociação comercial.',
    180
  );
  doc.text(splitNotes, 14, y);
  y += splitNotes.length * 4.5 + 6;

  // Nota de Conformidade Técnica (Obrigatória pela Missão Executiva)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, y, 182, 20, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text('NOTA TÉCNICA E REGULATÓRIA:', 18, y + 5.5);
  doc.setFont('helvetica', 'normal');
  const techDisclaimer = doc.splitTextToSize(
    'Esta proposta comercial baseia-se no inventário informado/registrado anteriormente e não constitui laudo técnico ou certificado de conformidade. Os serviços efetivos de inspeção, manutenção de 1º, 2º ou 3º nível (ensaio hidrostático) seguem a ABNT NBR 12962 e a Portaria INMETRO nº 58/2022 após verificação física dos equipamentos pela oficina.',
    174
  );
  doc.text(techDisclaimer, 18, y + 10.5);

  // Rodapé Institucional Oficial RenovaExt
  doc.setDrawColor(216, 228, 224);
  doc.line(14, 282, 196, 282);
  doc.setFillColor(12, 55, 62);
  doc.roundedRect(14, 284, 5, 5, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(12, 55, 62);
  doc.text('RenovaExt', 21, 287.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(79, 100, 104);
  doc.text(
    '• Agenda Comercial e Propostas em PDF para Empresas de Inspeção, Manutenção e Recarga de Extintores',
    36.5,
    287.8
  );

  const safeClientSlug = client.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);

  const fileName = `${proposal.proposalNumber}-${safeClientSlug || 'Cliente'}.pdf`;

  if (triggerBrowserDownload && typeof window !== 'undefined') {
    doc.save(fileName);
  }

  const textSummary = [
    `PROPOSTA COMERCIAL ${proposal.proposalNumber} — ${company.name}`,
    `Cliente: ${client.name} (${client.contactName || 'A/C Responsável'})`,
    `Itens cotados:`,
    ...proposal.items.map(
      (it) =>
        `• ${it.quantity}x ${it.equipmentLabel} — ${it.serviceDescription}: ${formatCurrencyBrl(
          it.unitPriceBrl
        )}/un (Subtotal: ${formatCurrencyBrl(it.subtotalBrl)})`
    ),
    `VALOR TOTAL: ${formatCurrencyBrl(proposal.totalBrl)}`,
    `Validade da proposta: ${proposal.validityDays} dias (até ${validUntilDate}).`,
    `Observações: ${proposal.notes || company.defaultProposalNotes}`,
  ].join('\n');

  return {
    fileName,
    pdfInstance: doc,
    textSummary,
  };
}
