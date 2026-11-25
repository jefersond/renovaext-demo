import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { tenantRepository } from '../services/tenantRepository';
import { enqueueSupabaseSync, flushSupabaseSyncQueue } from '../services/supabaseStagingSync';
import { PLAN_HYPOTHESES } from '../types/domain';

describe('RenovaExt — Bloqueios Comerciais Resolvidos (Prontidão para Faturar)', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    tenantRepository.resetDatabaseForTests();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
  });

  it('Em /demo/, entra automaticamente na demonstração fictícia e clicar em "Entrar / Criar Conta" abre Login/Cadastro sem loop infinito', async () => {
    window.history.replaceState({}, '', '/demo/');
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    // Abriu automaticamente na demonstração fictícia
    expect(container.textContent).toContain('AMBIENTE DE DEMONSTRAÇÃO (DADOS FICTÍCIOS)');
    expect(container.textContent).toContain('Oficina ProtegeFogo Extintores');

    // Clicar no botão "Entrar / Criar Conta" (que antes entrava em loop infinito)
    const exitDemoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Entrar / Criar Conta')
    );
    expect(exitDemoBtn).toBeDefined();

    await act(async () => {
      exitDemoBtn!.click();
    });

    // Deve estar agora na tela de Cadastro / Login sem voltar automaticamente para a demo
    expect(container.textContent).toContain('Criar Conta da Oficina');
    expect(container.textContent).toContain('Entrar na Minha Conta');
    expect(container.textContent).not.toContain('AMBIENTE DE DEMONSTRAÇÃO (DADOS FICTÍCIOS)');

    await act(async () => {
      root.unmount();
    });
  });

  it('Enforce do limite de clientes do Plano Inicial (150 clientes) também no cadastro manual', () => {
    const { company, session } = tenantRepository.registerCompanyAccount({
      companyName: 'Oficina Limite Teste',
      responsibleName: 'João',
      email: 'joao@oficinalimite.com.br',
      password: 'senha-forte-123',
      phone: '(11) 99999-1111',
      city: 'São Paulo',
      state: 'SP',
      selectedPlanHypothesis: 'inicial_49',
    });

    const max = PLAN_HYPOTHESES.inicial_49.maxClients;
    for (let i = 1; i <= max; i++) {
      tenantRepository.createOrUpdateClient({
        companyId: company.id,
        actorEmail: session.email,
        name: `Condomínio ${i}`,
        organizationName: `Condomínio ${i}`,
        contactName: 'Síndico',
        contactPhone: '(11) 90000-0000',
        contactEmail: '',
        city: 'São Paulo',
        notes: '',
        needsReview: false,
        reviewReason: null,
      });
    }

    expect(() =>
      tenantRepository.createOrUpdateClient({
        companyId: company.id,
        actorEmail: session.email,
        name: 'Condomínio Excedente 151',
        organizationName: 'Condomínio Excedente 151',
        contactName: 'Síndico',
        contactPhone: '',
        contactEmail: '',
        city: 'São Paulo',
        notes: '',
        needsReview: false,
        reviewReason: null,
      })
    ).toThrow(/Limite de carteira do Plano Inicial \(150 clientes\) atingido/i);
  });

  it('Fila de sincronização Supabase preserva ordem estrita FIFO (evita race condition de FK cliente -> equipamento)', async () => {
    const executionOrder: string[] = [];

    const p1 = enqueueSupabaseSync('cliente', async () => {
      await new Promise((r) => setTimeout(r, 25));
      executionOrder.push('client_inserted');
      return { error: null };
    });

    const p2 = enqueueSupabaseSync('equipamento', async () => {
      executionOrder.push('equipment_inserted');
      return { error: null };
    });

    const p3 = enqueueSupabaseSync('histórico', async () => {
      executionOrder.push('history_inserted');
      return { error: null };
    });

    await Promise.all([p1, p2, p3]);
    await flushSupabaseSyncQueue();

    expect(executionOrder).toEqual([
      'client_inserted',
      'equipment_inserted',
      'history_inserted',
    ]);
  });
});
