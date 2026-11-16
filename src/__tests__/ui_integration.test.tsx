import React, { act } from 'react';
import ReactDOM from 'react-dom/client';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { tenantRepository } from '../services/tenantRepository';
import {
  clearInMemoryCommercialLeadsForTests,
  listLocalCommercialLeadsForAudit,
} from '../services/commercialLeadService';

describe('RenovaExt MVP — Teste de Integração da Interface (3 Telas, CTAs e Fluxo de Leads)', () => {
  beforeEach(() => {
    (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
    tenantRepository.resetDatabaseForTests();
    clearInMemoryCommercialLeadsForTests();
    document.body.innerHTML = '';
  });

  it('Renderiza a tela inicial, entra na Demonstração Fictícia, bloqueia upload de planilha real na demo e navega pelas 3 Telas', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    // Verifica que o posicionamento comercial e os CTAs "Solicitar demonstração" e "Quero participar do piloto" estão visíveis
    expect(container.textContent).toContain(
      'Transforme sua carteira de manutenção de extintores em uma agenda organizada de renovações'
    );
    expect(container.textContent).toContain('Solicitar demonstração');
    expect(container.textContent).toContain('Quero participar do piloto');

    // Clicar no botão de Demonstração Navegável (Dados Fictícios)
    const demoBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Acessar Demonstração Navegável')
    );
    expect(demoBtn).toBeDefined();

    await act(async () => {
      demoBtn!.click();
    });

    // Agora deve estar na Tela 1 (Painel de Vencimentos e Radar) com CTAs visíveis no topo
    expect(container.textContent).toContain(
      'Painel de Vencimentos e Acompanhamento Comercial'
    );
    expect(container.textContent).toContain('Solicitar demonstração');
    expect(container.textContent).toContain('Quero participar do piloto');
    expect(container.textContent).toContain('Condomínio Edifício Atlântico Sul (Fictício)');
    expect(container.textContent).toContain('Metalúrgica Precisão Industrial (Fictício)');

    // Navegar para Tela 2 (Importação & Carteira)
    const screen2Btn = Array.from(
      container.querySelectorAll<HTMLButtonElement>('nav button')
    ).find((b) => b.textContent?.includes('Tela 2: Importação & Carteira'));
    expect(screen2Btn).toBeDefined();

    await act(async () => {
      screen2Btn!.click();
    });

    expect(container.textContent).toContain(
      'Assistente de Importação de Planilhas (Passo 1 de 3)'
    );
    // Comprovar que no modo demonstração o upload externo de arquivos reais está bloqueado
    expect(container.querySelector('[data-testid="demo-real-upload-lock"]')).not.toBeNull();
    expect(container.querySelector('input[type="file"]')).toBeNull();

    // Navegar para Tela 3 (Oportunidade & Proposta PDF)
    const screen3Btn = Array.from(
      container.querySelectorAll<HTMLButtonElement>('nav button')
    ).find((b) => b.textContent?.includes('Tela 3: Oportunidade & Proposta PDF'));
    expect(screen3Btn).toBeDefined();

    await act(async () => {
      screen3Btn!.click();
    });

    expect(container.textContent).toContain(
      'Etapa da Oportunidade no Funil Comercial'
    );
    expect(container.textContent).toContain('Preparar Proposta Comercial (PDF)');

    await act(async () => {
      root.unmount();
    });
  });

  it('Executa o fluxo Visitante -> CTA -> Formulário Comercial -> Registro Separado -> Confirmação com Protocolo', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOM.createRoot(container);

    await act(async () => {
      root.render(<App />);
    });

    const ctaDemoBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Solicitar demonstração'
    );
    expect(ctaDemoBtn).toBeDefined();

    await act(async () => {
      ctaDemoBtn!.click();
    });

    expect(container.textContent).toContain('Solicitar Demonstração Guiada — RenovaExt');

    const setInputValue = (selector: string, val: string) => {
      const el = container.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        selector
      );
      expect(el).not.toBeNull();
      const proto =
        el instanceof HTMLSelectElement
          ? window.HTMLSelectElement.prototype
          : el instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      setter?.call(el, val);
      el!.dispatchEvent(new Event('input', { bubbles: true }));
      el!.dispatchEvent(new Event('change', { bubbles: true }));
    };

    await act(async () => {
      setInputValue('#lead-responsible-name', 'Eduardo Martins');
      setInputValue('#lead-workshop-name', 'Martins Recarga de Extintores (Teste)');
      setInputValue('#lead-commercial-email', 'eduardo@martinsextintores-teste.com.br');
      setInputValue('#lead-phone-optional', '(11) 98888-7777');
      setInputValue('#lead-portfolio-size', '151_a_300_clientes');
      setInputValue('#lead-plan-interest', 'profissional_79');
      setInputValue('#lead-notes', 'Controlamos hoje em 3 planilhas Excel separadas.');

      const checkbox = container.querySelector<HTMLInputElement>(
        '[data-testid="commercial-lead-form"] input[type="checkbox"]'
      );
      expect(checkbox).not.toBeNull();
      checkbox!.click();
    });

    const form = container.querySelector('[data-testid="commercial-lead-form"]');
    expect(form).not.toBeNull();

    await act(async () => {
      form!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    const receiptBox = container.querySelector('[data-testid="lead-confirmation-receipt"]');
    expect(receiptBox).not.toBeNull();
    expect(receiptBox?.textContent).toContain('PROTOCOLO OFICIAL: SOL-');
    expect(receiptBox?.textContent).toContain('Martins Recarga de Extintores (Teste)');

    // Comprovar que o registro foi salvo e que pedido de demonstração NÃO atribui plano pago como escolha expressa
    const savedLeads = listLocalCommercialLeadsForAudit();
    expect(savedLeads.length).toBe(1);
    expect(savedLeads[0].workshopName).toBe('Martins Recarga de Extintores (Teste)');
    expect(savedLeads[0].planInterest).toBe('nao_selecionado');

    await act(async () => {
      root.unmount();
    });
  });
});
