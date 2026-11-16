export type PlanHypothesisId = 'inicial_49' | 'profissional_79';

export interface PlanHypothesisSpec {
  id: PlanHypothesisId;
  name: string;
  monthlyPriceBrl: number;
  maxClients: number;
  description: string;
  features: string[];
}

export const PLAN_HYPOTHESES: Record<PlanHypothesisId, PlanHypothesisSpec> = {
  inicial_49: {
    id: 'inicial_49',
    name: 'Plano Inicial (Hipótese em Teste)',
    monthlyPriceBrl: 49,
    maxClients: 150,
    description: 'Para oficinas pequenas iniciando a organização comercial da carteira.',
    features: [
      'Até 150 clientes na carteira ativa',
      'Assistente de importação CSV e XLSX',
      'Radar de renovações (Atrasados, 30, 60 e 90 dias)',
      'Geração de propostas comerciais em PDF',
    ],
  },
  profissional_79: {
    id: 'profissional_79',
    name: 'Plano Profissional (Hipótese em Teste)',
    monthlyPriceBrl: 79,
    maxClients: 500,
    description: 'Para oficinas com carteiras maiores e acompanhamento comercial completo.',
    features: [
      'Até 500 clientes na carteira ativa',
      'Assistente avançado CSV/XLSX com detecção de duplicatas',
      'Radar completo + Funil comercial de 7 etapas com histórico',
      'Propostas em PDF personalizadas + Exportação completa de dados',
    ],
  },
};

export type OpportunityStage =
  | 'pendente_conferencia'
  | 'pronto_para_contato'
  | 'contatado'
  | 'proposta_preparada'
  | 'proposta_enviada'
  | 'aceito'
  | 'perdido';

export const OPPORTUNITY_STAGE_LABELS: Record<OpportunityStage, string> = {
  pendente_conferencia: 'Pendente de conferência',
  pronto_para_contato: 'Pronto para contato',
  contatado: 'Contatado',
  proposta_preparada: 'Proposta preparada',
  proposta_enviada: 'Proposta enviada',
  aceito: 'Aceito',
  perdido: 'Perdido',
};

export const OPPORTUNITY_STAGE_ORDER: OpportunityStage[] = [
  'pendente_conferencia',
  'pronto_para_contato',
  'contatado',
  'proposta_preparada',
  'proposta_enviada',
  'aceito',
  'perdido',
];

export type RadarWindow = 'ATRASADO' | 'D_30' | 'D_60' | 'D_90' | 'FUTURO' | 'INCOMPLETO';

export const RADAR_WINDOW_LABELS: Record<RadarWindow, string> = {
  ATRASADO: 'A conferir agora (Atrasados)',
  D_30: 'Próximos 30 dias',
  D_60: 'Próximos 60 dias (31 a 60d)',
  D_90: 'Próximos 90 dias (61 a 90d)',
  INCOMPLETO: 'Dados incompletos (Necessita conferência)',
  FUTURO: 'Acima de 90 dias',
};

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  responsibleName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  selectedPlanHypothesis: PlanHypothesisId;
  billingActive: false;
  defaultProposalValidityDays: number;
  defaultProposalNotes: string;
  isDemoCompany: boolean;
  createdAt: string;
}

export interface UserSession {
  userId: string;
  companyId: string;
  email: string;
  fullName: string;
  role: 'owner' | 'admin' | 'staff';
}

export interface Client {
  id: string;
  companyId: string;
  name: string;
  organizationName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  notes: string;
  needsReview: boolean;
  reviewReason: string | null;
  opportunityStage: OpportunityStage;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentRecord {
  id: string;
  companyId: string;
  clientId: string;
  description: string;
  extinguisherType: string;
  capacity: string | null;
  quantity: number;
  lastServiceDate: string | null; // YYYY-MM-DD
  nextDueDate: string | null; // YYYY-MM-DD — NUNCA inventada automaticamente
  needsReview: boolean;
  reviewNotes: string | null;
  notes: string;
  dedupeFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceHistoryEntry {
  id: string;
  companyId: string;
  clientId: string;
  serviceDate: string; // YYYY-MM-DD
  description: string;
  notes: string;
  createdAt: string;
}

export interface OpportunityHistoryEntry {
  id: string;
  companyId: string;
  clientId: string;
  fromStage: OpportunityStage | null;
  toStage: OpportunityStage;
  note: string;
  changedBy: string;
  createdAt: string;
}

export interface ProposalItem {
  id: string;
  equipmentId: string | null;
  equipmentLabel: string;
  serviceDescription: string;
  quantity: number;
  unitPriceBrl: number;
  subtotalBrl: number;
}

export type ProposalStatus = 'rascunho' | 'gerada' | 'enviada' | 'aceita' | 'perdida';

export interface Proposal {
  id: string;
  proposalNumber: string;
  companyId: string;
  clientId: string;
  status: ProposalStatus;
  validityDays: number;
  items: ProposalItem[];
  totalBrl: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  companyId: string;
  actorEmail: string;
  action:
    | 'COMPANY_CREATED'
    | 'AUTH_LOGIN'
    | 'COMPANY_UPDATED'
    | 'IMPORT_BATCH'
    | 'CLIENT_CREATED'
    | 'CLIENT_UPDATED'
    | 'CLIENT_REVIEWED'
    | 'EQUIPMENT_ADDED'
    | 'STAGE_UPDATED'
    | 'PROPOSAL_CREATED'
    | 'PROPOSAL_STATUS_UPDATED'
    | 'DATA_EXPORTED'
    | 'SECURITY_ALERT';
  details: string;
  createdAt: string;
}

export interface SpreadsheetColumnMapping {
  clientName: string;
  organizationName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  equipmentDescription: string;
  extinguisherType: string;
  capacity: string;
  quantity: string;
  lastServiceDate: string;
  nextDueDate: string;
  notes: string;
}

export interface ParsedImportRow {
  rowIndex: number;
  selected: boolean;
  clientName: string;
  organizationName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  city: string;
  equipmentDescription: string;
  extinguisherType: string;
  capacity: string | null;
  quantity: number;
  lastServiceDate: string | null;
  nextDueDate: string | null;
  notes: string;
  needsReview: boolean;
  reviewReasons: string[];
  isDuplicate: boolean;
  duplicateReason: string | null;
  dedupeFingerprint: string;
}

export interface DashboardMetrics {
  totalClients: number;
  totalEquipmentsCount: number;
  overdueClientsCount: number;
  due30ClientsCount: number;
  due60ClientsCount: number;
  due90ClientsCount: number;
  incompleteClientsCount: number;
  pendingOpportunitiesCount: number;
  proposalsCreatedCount: number;
  proposalsAcceptedCount: number;
  proposalsLostCount: number;
}
