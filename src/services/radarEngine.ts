import {
  Client,
  DashboardMetrics,
  EquipmentRecord,
  Proposal,
  RadarWindow,
} from '../types/domain';

export interface ClientRadarSummary {
  client: Client;
  equipments: EquipmentRecord[];
  totalUnits: number;
  earliestNextDueDate: string | null;
  daysUntilDue: number | null;
  radarWindow: RadarWindow;
  needsReview: boolean;
  reviewReasons: string[];
}

/**
 * Calcula a diferença em dias corridos entre uma data ISO (YYYY-MM-DD)
 * e a data de referência (YYYY-MM-DD).
 */
export function diffInCalendarDays(targetIso: string, referenceIso: string): number {
  const [ty, tm, td] = targetIso.split('-').map(Number);
  const [ry, rm, rd] = referenceIso.split('-').map(Number);
  const targetUtc = Date.UTC(ty, tm - 1, td);
  const refUtc = Date.UTC(ry, rm - 1, rd);
  return Math.round((targetUtc - refUtc) / (1000 * 60 * 60 * 24));
}

/**
 * Obtém a data atual local em formato YYYY-MM-DD.
 */
export function getTodayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Classifica deterministicamente cada cliente da carteira na janela do Radar de Renovações.
 * Regras (conforme POP-03):
 * - INCOMPLETO: Cliente marcado com needsReview, sem equipamentos ou equipamento sem nextDueDate.
 * - ATRASADO: daysUntilDue < 0
 * - D_30: 0 <= daysUntilDue <= 30
 * - D_60: 31 <= daysUntilDue <= 60
 * - D_90: 61 <= daysUntilDue <= 90
 * - FUTURO: daysUntilDue > 90
 */
export function buildClientRadarSummaries(
  clients: Client[],
  equipments: EquipmentRecord[],
  referenceDateIso: string = getTodayIsoLocal()
): ClientRadarSummary[] {
  return clients
    .map((client) => {
      const clientEquips = equipments.filter((eq) => eq.clientId === client.id);
      const totalUnits = clientEquips.reduce((acc, eq) => acc + eq.quantity, 0);

      const reviewReasons: string[] = [];
      if (client.needsReview && client.reviewReason) {
        reviewReasons.push(client.reviewReason);
      }
      if (clientEquips.length === 0) {
        reviewReasons.push('Cliente sem equipamentos registrados');
      }

      let hasIncompleteEquipment = false;
      const validDueDates: string[] = [];

      for (const eq of clientEquips) {
        if (eq.needsReview || !eq.nextDueDate) {
          hasIncompleteEquipment = true;
          if (eq.reviewNotes && !reviewReasons.includes(eq.reviewNotes)) {
            reviewReasons.push(eq.reviewNotes);
          } else if (!eq.nextDueDate) {
            const msg = `Equipamento (${eq.extinguisherType}) sem data de próximo acompanhamento`;
            if (!reviewReasons.includes(msg)) reviewReasons.push(msg);
          }
        }
        if (eq.nextDueDate) {
          validDueDates.push(eq.nextDueDate);
        }
      }

      validDueDates.sort();
      const earliestNextDueDate = validDueDates.length > 0 ? validDueDates[0] : null;
      const daysUntilDue =
        earliestNextDueDate !== null
          ? diffInCalendarDays(earliestNextDueDate, referenceDateIso)
          : null;

      const needsReview = client.needsReview || clientEquips.length === 0 || hasIncompleteEquipment;

      let radarWindow: RadarWindow;
      if (daysUntilDue !== null && daysUntilDue < 0) {
        // Mesmo que haja outro item incompleto, se já há vencimento atrasado prioriza alerta imediato
        radarWindow = 'ATRASADO';
      } else if (needsReview || daysUntilDue === null) {
        radarWindow = 'INCOMPLETO';
      } else if (daysUntilDue <= 30) {
        radarWindow = 'D_30';
      } else if (daysUntilDue <= 60) {
        radarWindow = 'D_60';
      } else if (daysUntilDue <= 90) {
        radarWindow = 'D_90';
      } else {
        radarWindow = 'FUTURO';
      }

      return {
        client,
        equipments: clientEquips,
        totalUnits,
        earliestNextDueDate,
        daysUntilDue,
        radarWindow,
        needsReview,
        reviewReasons,
      };
    })
    .sort((a, b) => {
      const priorityOrder: Record<RadarWindow, number> = {
        ATRASADO: 1,
        D_30: 2,
        INCOMPLETO: 3,
        D_60: 4,
        D_90: 5,
        FUTURO: 6,
      };
      if (priorityOrder[a.radarWindow] !== priorityOrder[b.radarWindow]) {
        return priorityOrder[a.radarWindow] - priorityOrder[b.radarWindow];
      }
      if (a.daysUntilDue !== null && b.daysUntilDue !== null) {
        return a.daysUntilDue - b.daysUntilDue;
      }
      return a.client.name.localeCompare(b.client.name, 'pt-BR');
    });
}

/**
 * Calcula os indicadores do Painel Principal (Seção 3.C).
 */
export function computeDashboardMetrics(
  summaries: ClientRadarSummary[],
  proposals: Proposal[]
): DashboardMetrics {
  const totalClients = summaries.length;
  const totalEquipmentsCount = summaries.reduce((sum, s) => sum + s.totalUnits, 0);
  const overdueClientsCount = summaries.filter((s) => s.radarWindow === 'ATRASADO').length;
  const due30ClientsCount = summaries.filter((s) => s.radarWindow === 'D_30').length;
  const due60ClientsCount = summaries.filter((s) => s.radarWindow === 'D_60').length;
  const due90ClientsCount = summaries.filter((s) => s.radarWindow === 'D_90').length;
  const incompleteClientsCount = summaries.filter(
    (s) => s.radarWindow === 'INCOMPLETO' || s.needsReview
  ).length;

  const pendingOpportunitiesCount = summaries.filter(
    (s) => s.client.opportunityStage !== 'aceito' && s.client.opportunityStage !== 'perdido'
  ).length;

  const proposalsCreatedCount = proposals.length;
  const proposalsAcceptedCount = proposals.filter((p) => p.status === 'aceita').length;
  const proposalsLostCount = proposals.filter((p) => p.status === 'perdida').length;

  return {
    totalClients,
    totalEquipmentsCount,
    overdueClientsCount,
    due30ClientsCount,
    due60ClientsCount,
    due90ClientsCount,
    incompleteClientsCount,
    pendingOpportunitiesCount,
    proposalsCreatedCount,
    proposalsAcceptedCount,
    proposalsLostCount,
  };
}
