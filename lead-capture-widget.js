/**
 * RenovaExt MVP — Motor Público de Registro de Solicitações Comerciais (Demonstração / Piloto 30 Dias)
 * Conecta os formulários públicos (/comercial.html e /proposta-piloto.html) diretamente à RPC
 * public.submit_commercial_lead no Supabase Staging.
 *
 * REGRAS DE SEGURANÇA E PRIVACIDADE (LGPD):
 * - Nenhum dado pessoal (nome, e-mail, telefone ou oficina) é gravado em localStorage/sessionStorage
 *   ou impresso em logs públicos do navegador.
 * - O armazenamento em banco ocorre em public.commercial_leads (com RLS + REVOKE SELECT para anon
 *   e authenticated) e sincroniza continuamente via trigger SQL para public.commercial_crm_pipeline.
 */
(function () {
  const SUPABASE_URL = 'https://xmuzcnjcwkhgojnaosha.supabase.co';
  const SUPABASE_ANON_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtdXpjbmpjd2toZ29qbmFvc2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ1MjIxMTAsImV4cCI6MjExMDA5ODExMH0.CDK7TXV2pdKsO8V2VV0wkQnapC_9k5CgS5CpqLoepOk';

  // Armazena APENAS timestamps numéricos de cooldown anti-spam (zero dados pessoais no navegador)
  const COOLDOWN_KEY = 'renovaext_lead_cooldown_ts_v2';
  const LEGACY_PII_KEY = 'renovaext_commercial_leads_isolated_v1';
  const pageOpenedAt = Date.now();
  let lastReceiptInMemory = null;

  const PORTFOLIO_LABELS = {
    ate_50_clientes: 'Até 50 clientes ativos',
    '51_a_150_clientes': 'De 51 a 150 clientes ativos',
    '151_a_300_clientes': 'De 151 a 300 clientes ativos',
    '301_a_500_clientes': 'De 301 a 500 clientes ativos',
    mais_de_500_clientes: 'Mais de 500 clientes ativos',
  };

  // Remover qualquer chave legada que pudesse conter dados em localStorage
  try {
    if (window.localStorage) {
      window.localStorage.removeItem(LEGACY_PII_KEY);
    }
  } catch {
    // Ignorar se localStorage estiver bloqueado
  }

  function isClientCooldownActive() {
    try {
      const raw = window.localStorage.getItem(COOLDOWN_KEY);
      if (!raw) return false;
      const tsList = JSON.parse(raw);
      if (!Array.isArray(tsList)) return false;
      const recent = tsList.filter((t) => typeof t === 'number' && Date.now() - t < 5 * 60 * 1000);
      return recent.length >= 2;
    } catch {
      return false;
    }
  }

  function recordCooldownTimestamp() {
    try {
      const raw = window.localStorage.getItem(COOLDOWN_KEY);
      const tsList = raw ? JSON.parse(raw) : [];
      const clean = Array.isArray(tsList)
        ? tsList.filter((t) => typeof t === 'number' && Date.now() - t < 15 * 60 * 1000)
        : [];
      clean.push(Date.now());
      window.localStorage.setItem(COOLDOWN_KEY, JSON.stringify(clean.slice(-5)));
    } catch {
      // Ignorar falha de storage
    }
  }

  window.selectLeadIntentAndScroll = function (intentType, planId) {
    const intentInput = document.getElementById('leadIntentType');
    const btnDemo = document.getElementById('btnIntentDemo');
    const btnPiloto = document.getElementById('btnIntentPiloto');
    const planSelect = document.getElementById('leadPlanInterest');
    const submitBtnText = document.getElementById('leadSubmitBtnText');

    if (intentInput) {
      intentInput.value = intentType;
    }
    if (planId && planSelect) {
      planSelect.value = planId;
    }
    if (btnDemo && btnPiloto) {
      if (intentType === 'solicitar_demonstracao') {
        btnDemo.className =
          'p-3.5 rounded-xl border-2 border-red-500 bg-red-950/30 text-white text-left transition-all cursor-pointer';
        btnPiloto.className =
          'p-3.5 rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 text-left transition-all cursor-pointer hover:border-slate-500';
      } else {
        btnPiloto.className =
          'p-3.5 rounded-xl border-2 border-red-500 bg-red-950/30 text-white text-left transition-all cursor-pointer';
        btnDemo.className =
          'p-3.5 rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 text-left transition-all cursor-pointer hover:border-slate-500';
      }
    }
    if (submitBtnText) {
      submitBtnText.textContent =
        intentType === 'solicitar_demonstracao'
          ? 'Confirmar Solicitação de Demonstração →'
          : 'Confirmar Inscrição no Piloto de 30 Dias →';
    }

    const section = document.getElementById('solicitar');
    if (section && section.scrollIntoView) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.downloadLeadReceiptJson = function () {
    if (!lastReceiptInMemory) return;
    const payload = {
      sistema: 'RenovaExt MVP — Comprovante Oficial de Solicitação Comercial',
      protocolo: lastReceiptInMemory.protocolCode,
      tipoSolicitacao:
        lastReceiptInMemory.intentType === 'solicitar_demonstracao'
          ? 'Solicitar demonstração'
          : 'Quero participar do piloto (30 dias)',
      oficina: lastReceiptInMemory.workshopName,
      tamanhoAproximadoCarteira:
        PORTFOLIO_LABELS[lastReceiptInMemory.portfolioSize] || lastReceiptInMemory.portfolioSize,
      planoInteresse:
        lastReceiptInMemory.planInterest === 'inicial_49'
          ? 'Plano Inicial — R$ 49/mês (até 150 clientes)'
          : 'Plano Profissional — R$ 79/mês (até 500 clientes)',
      registradoEmUtc: lastReceiptInMemory.createdAt,
      canalRetornoVerificado:
        'Retorno comercial enviado em até 1 dia útil (segunda a sexta-feira) diretamente para o e-mail comercial e/ou telefone informados.',
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comprovante-${lastReceiptInMemory.protocolCode}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  window.submitPublicLeadForm = async function (event, sourcePage) {
    event.preventDefault();
    const errorBox = document.getElementById('leadFormError');
    const formContainer = document.getElementById('leadFormContainer');
    const receiptContainer = document.getElementById('leadReceiptContainer');
    const submitBtn = document.getElementById('leadSubmitBtn');

    if (errorBox) {
      errorBox.classList.add('hidden');
      errorBox.textContent = '';
    }

    const intentType =
      (document.getElementById('leadIntentType') || {}).value || 'solicitar_demonstracao';
    const responsibleName = (
      (document.getElementById('leadResponsibleName') || {}).value || ''
    ).trim();
    const workshopName = ((document.getElementById('leadWorkshopName') || {}).value || '').trim();
    const email = ((document.getElementById('leadEmail') || {}).value || '').trim().toLowerCase();
    const phone = ((document.getElementById('leadPhone') || {}).value || '').trim();
    const portfolioSize =
      (document.getElementById('leadPortfolioSize') || {}).value || '51_a_150_clientes';
    const planInterest =
      (document.getElementById('leadPlanInterest') || {}).value || 'profissional_79';
    const notes = ((document.getElementById('leadNotes') || {}).value || '').trim();
    const privacyConsent = Boolean(
      (document.getElementById('leadPrivacyConsent') || {}).checked
    );
    const honeypot = ((document.getElementById('leadHoneypot') || {}).value || '').trim();
    const elapsedMs = Math.max(950, Date.now() - pageOpenedAt);

    function showError(msg) {
      if (errorBox) {
        errorBox.textContent = msg;
        errorBox.classList.remove('hidden');
      }
    }

    if (honeypot !== '') {
      showError('Submissão automatizada bloqueada (proteção anti-spam).');
      return;
    }
    if (responsibleName.length < 2) {
      showError('Informe o nome do responsável pela oficina.');
      return;
    }
    if (workshopName.length < 2) {
      showError('Informe o nome da oficina.');
      return;
    }
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) {
      showError('Informe um e-mail comercial válido.');
      return;
    }
    if (!privacyConsent) {
      showError('É necessário concordar com a Política de Privacidade para enviar a solicitação.');
      return;
    }
    if (isClientCooldownActive()) {
      showError(
        'Já recebemos uma solicitação recente deste navegador. Aguarde alguns minutos antes de enviar novamente.'
      );
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_commercial_lead`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          p_intent_type: intentType,
          p_responsible_name: responsibleName,
          p_workshop_name: workshopName,
          p_email: email,
          p_phone: phone || null,
          p_portfolio_size: portfolioSize,
          p_plan_interest: planInterest,
          p_notes: notes || null,
          p_source_page: sourcePage || (window.location.pathname + window.location.search).slice(0, 120),
          p_privacy_consent: true,
          p_honeypot: honeypot,
          p_elapsed_ms: elapsedMs,
          p_is_test_submission: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg =
          (data && (data.message || data.error_description || data.details)) ||
          'Erro ao registrar solicitação.';
        throw new Error(errMsg);
      }

      recordCooldownTimestamp();

      // Mantido apenas em variável efêmera de memória da aba atual para exibição/download imediato do protocolo
      lastReceiptInMemory = {
        id: data.id,
        protocolCode: data.protocolCode,
        intentType: data.intentType || intentType,
        workshopName: workshopName,
        responsibleName: responsibleName,
        email: email,
        phone: phone || null,
        portfolioSize: data.portfolioSize || portfolioSize,
        planInterest: data.planInterest || planInterest,
        status: data.status || 'recebido_aguardando_contato',
        createdAt: data.createdAt || new Date().toISOString(),
      };

      if (formContainer && receiptContainer) {
        formContainer.classList.add('hidden');
        receiptContainer.classList.remove('hidden');

        const setElText = (id, text) => {
          const el = document.getElementById(id);
          if (el) el.textContent = text;
        };
        setElText('receiptProtocolCode', lastReceiptInMemory.protocolCode);
        setElText('receiptWorkshopName', lastReceiptInMemory.workshopName);
        setElText('receiptResponsibleName', lastReceiptInMemory.responsibleName);
        setElText(
          'receiptIntentLabel',
          lastReceiptInMemory.intentType === 'solicitar_demonstracao'
            ? 'Solicitar demonstração'
            : 'Quero participar do piloto (30 dias)'
        );
        setElText('receiptEmail', lastReceiptInMemory.email);
        setElText('receiptPhone', lastReceiptInMemory.phone || 'Não informado');
        setElText(
          'receiptPortfolioSize',
          PORTFOLIO_LABELS[lastReceiptInMemory.portfolioSize] || lastReceiptInMemory.portfolioSize
        );
        setElText(
          'receiptPlanInterest',
          lastReceiptInMemory.planInterest === 'inicial_49'
            ? 'Plano Inicial — R$ 49/mês (até 150 clientes)'
            : 'Plano Profissional — R$ 79/mês (até 500 clientes)'
        );
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Não foi possível registrar sua solicitação.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  };
})();
