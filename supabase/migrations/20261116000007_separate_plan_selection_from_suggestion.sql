-- ============================================================================
-- RENOVAEXT MVP — MIGRAÇÃO 07: SEPARAÇÃO ENTRE ESCOLHA EFETIVA DE PLANO E
-- SUGESTÃO COMERCIAL, TRATAMENTO DE CARTEIRAS > 500 CLIENTES E CANAL LGPD
-- Arquivo: supabase/migrations/20261116000007_separate_plan_selection_from_suggestion.sql
-- ============================================================================

-- 1. Ajustar restrições e adicionar coluna suggested_plan em public.commercial_leads
ALTER TABLE public.commercial_leads
  ADD COLUMN IF NOT EXISTS suggested_plan text NOT NULL DEFAULT 'nao_aplicavel';

ALTER TABLE public.commercial_leads
  DROP CONSTRAINT IF EXISTS commercial_leads_intent_type_check;

ALTER TABLE public.commercial_leads
  ADD CONSTRAINT commercial_leads_intent_type_check CHECK (
    intent_type IN (
      'solicitar_demonstracao',
      'quero_participar_piloto',
      'solicitacao_titular_lgpd'
    )
  );

ALTER TABLE public.commercial_leads
  DROP CONSTRAINT IF EXISTS commercial_leads_portfolio_size_check;

ALTER TABLE public.commercial_leads
  ADD CONSTRAINT commercial_leads_portfolio_size_check CHECK (
    portfolio_size IN (
      'ate_50_clientes',
      '51_a_150_clientes',
      '151_a_300_clientes',
      '301_a_500_clientes',
      'mais_de_500_clientes',
      'nao_aplicavel_lgpd'
    )
  );

ALTER TABLE public.commercial_leads
  DROP CONSTRAINT IF EXISTS commercial_leads_plan_interest_check;

ALTER TABLE public.commercial_leads
  ADD CONSTRAINT commercial_leads_plan_interest_check CHECK (
    plan_interest IN (
      'nao_selecionado',
      'inicial_49',
      'profissional_79',
      'avaliacao_acima_500'
    )
  );

ALTER TABLE public.commercial_leads
  DROP CONSTRAINT IF EXISTS commercial_leads_suggested_plan_check;

ALTER TABLE public.commercial_leads
  ADD CONSTRAINT commercial_leads_suggested_plan_check CHECK (
    suggested_plan IN (
      'inicial_49',
      'profissional_79',
      'sob_avaliacao_acima_500',
      'nao_aplicavel'
    )
  );

-- 2. Adicionar coluna suggested_plan em public.commercial_crm_pipeline e atualizar trigger
ALTER TABLE public.commercial_crm_pipeline
  ADD COLUMN IF NOT EXISTS suggested_plan text NOT NULL DEFAULT 'nao_aplicavel';

CREATE OR REPLACE FUNCTION public.sync_commercial_lead_to_crm()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.commercial_crm_pipeline (
    lead_code,
    source_channel,
    commercial_lead_id,
    workshop_name,
    responsible_name,
    email,
    phone,
    portfolio_size,
    plan_interest,
    suggested_plan,
    funnel_status,
    demo_requested,
    payment_confirmed,
    is_test_record,
    notes,
    created_at,
    updated_at
  ) VALUES (
    NEW.protocol_code,
    'formulario_publico_inbound',
    NEW.id,
    NEW.workshop_name,
    NEW.responsible_name,
    NEW.email,
    NEW.phone,
    NEW.portfolio_size,
    NEW.plan_interest,
    NEW.suggested_plan,
    NEW.crm_status,
    (NEW.intent_type = 'solicitar_demonstracao'),
    (NEW.crm_status = 'piloto_pago_confirmado'),
    NEW.is_test_submission,
    coalesce(NEW.founder_notes, NEW.notes),
    NEW.created_at,
    timezone('utc', now())
  )
  ON CONFLICT (lead_code) DO UPDATE
  SET
    plan_interest = EXCLUDED.plan_interest,
    suggested_plan = EXCLUDED.suggested_plan,
    funnel_status = EXCLUDED.funnel_status,
    demo_requested = EXCLUDED.demo_requested,
    payment_confirmed = EXCLUDED.payment_confirmed,
    is_test_record = EXCLUDED.is_test_record,
    notes = coalesce(NEW.founder_notes, NEW.notes),
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

-- 3. Atualizar RPC submit_commercial_lead para separar escolha efetiva (plan_interest)
--    de sugestão comercial (suggested_plan) e não prometer cobertura > 500 clientes nos planos atuais
CREATE OR REPLACE FUNCTION public.submit_commercial_lead(
  p_intent_type text,
  p_responsible_name text,
  p_workshop_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_portfolio_size text DEFAULT 'ate_50_clientes',
  p_plan_interest text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_source_page text DEFAULT '/comercial.html',
  p_privacy_consent boolean DEFAULT false,
  p_honeypot text DEFAULT '',
  p_elapsed_ms integer DEFAULT 0,
  p_is_test_submission boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean_email text;
  v_clean_responsible text;
  v_clean_workshop text;
  v_normalized_workshop text;
  v_clean_phone text;
  v_phone_digits text;
  v_clean_notes text;
  v_clean_portfolio text;
  v_raw_plan text;
  v_selected_plan text;
  v_suggested_plan text;
  v_email_hash text;
  v_workshop_hash text;
  v_phone_hash text;
  v_email_10m_count integer;
  v_email_24h_count integer;
  v_workshop_10m_count integer;
  v_phone_10m_count integer;
  v_global_1m_count integer;
  v_global_5m_count integer;
  v_effective_is_test boolean;
  v_protocol text;
  v_inserted_id uuid;
  v_created_at timestamptz;
BEGIN
  -- 1. Honeypot Server-Side
  IF coalesce(trim(p_honeypot), '') <> '' THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_HONEYPOT: Submissão automatizada bloqueada.';
  END IF;

  -- 2. Tempo mínimo de preenchimento
  IF coalesce(p_elapsed_ms, 0) < 800 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_FAST_SUBMIT: Preenchimento muito rápido detectado. Aguarde alguns segundos e tente novamente.';
  END IF;

  -- 3. Consentimento obrigatório da Política de Privacidade (LGPD)
  IF coalesce(p_privacy_consent, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'PRIVACY_CONSENT_REQUIRED: É obrigatório aceitar a Política de Privacidade para registrar a solicitação.';
  END IF;

  -- 4. Higienização e validação de conteúdo no servidor
  v_clean_email := lower(trim(coalesce(p_email, '')));
  v_clean_responsible := trim(coalesce(p_responsible_name, ''));
  v_clean_workshop := trim(coalesce(p_workshop_name, ''));
  v_normalized_workshop := regexp_replace(lower(v_clean_workshop), '\s+', ' ', 'g');
  v_clean_phone := left(nullif(trim(coalesce(p_phone, '')), ''), 40);
  v_phone_digits := nullif(regexp_replace(coalesce(v_clean_phone, ''), '\D', '', 'g'), '');
  v_clean_notes := left(nullif(trim(coalesce(p_notes, '')), ''), 1000);

  IF char_length(v_clean_responsible) < 2 OR char_length(v_clean_responsible) > 120 THEN
    RAISE EXCEPTION 'INVALID_RESPONSIBLE_NAME: Informe o nome do responsável (2 a 120 caracteres).';
  END IF;

  IF char_length(v_clean_workshop) < 2 OR char_length(v_clean_workshop) > 160 THEN
    RAISE EXCEPTION 'INVALID_WORKSHOP_NAME: Informe o nome da oficina (2 a 160 caracteres).';
  END IF;

  IF v_clean_responsible ~* '(<|>|http://|https://|www\.)'
     OR v_clean_workshop ~* '(<|>|http://|https://|www\.)'
     OR coalesce(v_clean_notes, '') ~* '(<script|javascript:|http://|https://)' THEN
    RAISE EXCEPTION 'INVALID_CHARACTERS_DETECTED: Caracteres, scripts ou links externos não são permitidos.';
  END IF;

  IF char_length(v_clean_email) > 160
     OR v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL: Informe um e-mail comercial válido.';
  END IF;

  IF v_phone_digits IS NOT NULL AND (char_length(v_phone_digits) < 8 OR char_length(v_phone_digits) > 15) THEN
    RAISE EXCEPTION 'INVALID_PHONE: Informe um telefone válido com DDD ou deixe o campo opcional em branco.';
  END IF;

  IF p_intent_type NOT IN (
    'solicitar_demonstracao',
    'quero_participar_piloto',
    'solicitacao_titular_lgpd'
  ) THEN
    RAISE EXCEPTION 'INVALID_INTENT_TYPE: Tipo de solicitação inválido.';
  END IF;

  v_clean_portfolio := coalesce(nullif(trim(p_portfolio_size), ''), 'nao_aplicavel_lgpd');
  IF p_intent_type = 'solicitacao_titular_lgpd' AND v_clean_portfolio = 'nao_aplicavel_lgpd' THEN
    -- Permitido para solicitações de titular de dados (LGPD)
    NULL;
  ELSIF v_clean_portfolio NOT IN (
    'ate_50_clientes',
    '51_a_150_clientes',
    '151_a_300_clientes',
    '301_a_500_clientes',
    'mais_de_500_clientes'
  ) THEN
    RAISE EXCEPTION 'INVALID_PORTFOLIO_SIZE: Selecione uma faixa válida de tamanho da carteira.';
  END IF;

  -- 5. Atribuição Estrita: Separar Escolha Efetiva (v_selected_plan) de Sugestão Comercial (v_suggested_plan)
  IF p_intent_type = 'solicitacao_titular_lgpd' THEN
    v_suggested_plan := 'nao_aplicavel';
    v_selected_plan := 'nao_selecionado';
  ELSIF v_clean_portfolio IN ('ate_50_clientes', '51_a_150_clientes') THEN
    v_suggested_plan := 'inicial_49';
  ELSIF v_clean_portfolio IN ('151_a_300_clientes', '301_a_500_clientes') THEN
    v_suggested_plan := 'profissional_79';
  ELSE
    -- mais_de_500_clientes: Não prometer cobertura dentro dos planos atuais de até 500 clientes
    v_suggested_plan := 'sob_avaliacao_acima_500';
  END IF;

  v_raw_plan := coalesce(nullif(trim(p_plan_interest), ''), 'nao_selecionado');

  IF p_intent_type = 'solicitar_demonstracao' THEN
    -- Pedidos de demonstração NUNCA aparecem como escolha expressa de um plano que o usuário não selecionou
    v_selected_plan := 'nao_selecionado';
  ELSIF p_intent_type = 'quero_participar_piloto' THEN
    IF v_clean_portfolio = 'mais_de_500_clientes' THEN
      -- Para carteiras acima de 500 clientes, impedir contratação direta de planos limitados a 150 ou 500
      IF v_raw_plan IN ('inicial_49', 'profissional_79') THEN
        RAISE EXCEPTION 'PORTFOLIO_EXCEEDS_PLAN_LIMIT: Os planos Inicial (até 150 clientes) e Profissional (até 500 clientes) não cobrem carteiras acima de 500 clientes. Selecione Demonstração ou Avaliação sob medida.';
      END IF;
      v_selected_plan := 'avaliacao_acima_500';
    ELSE
      IF v_raw_plan NOT IN ('inicial_49', 'profissional_79') THEN
        RAISE EXCEPTION 'INVALID_PLAN_INTEREST: Selecione o plano desejado para o piloto (Inicial R$ 49 ou Profissional R$ 79).';
      END IF;
      IF v_raw_plan = 'inicial_49' AND v_clean_portfolio IN ('151_a_300_clientes', '301_a_500_clientes') THEN
        RAISE EXCEPTION 'PORTFOLIO_EXCEEDS_INITIAL_PLAN: O plano Inicial (R$ 49/mês) cobre até 150 clientes. Para sua faixa de carteira, selecione o plano Profissional (R$ 79/mês, até 500 clientes).';
      END IF;
      v_selected_plan := v_raw_plan;
    END IF;
  END IF;

  -- 6. Rate Limiting 100% Server-Side (Independente de cabeçalhos HTTP falsificáveis)
  v_email_hash := encode(pg_catalog.sha256(convert_to(v_clean_email || ':renovaext-rl-v2', 'UTF8')), 'hex');
  v_workshop_hash := encode(pg_catalog.sha256(convert_to(v_normalized_workshop || ':renovaext-rl-v2', 'UTF8')), 'hex');
  v_phone_hash := CASE
    WHEN v_phone_digits IS NOT NULL THEN encode(pg_catalog.sha256(convert_to(v_phone_digits || ':renovaext-rl-v2', 'UTF8')), 'hex')
    ELSE NULL
  END;

  DELETE FROM public.commercial_lead_rate_limits
   WHERE created_at < (timezone('utc', now()) - interval '24 hours');

  SELECT count(*)
    INTO v_global_1m_count
    FROM public.commercial_lead_rate_limits
   WHERE created_at > (timezone('utc', now()) - interval '1 minute');

  IF v_global_1m_count >= 5 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_GLOBAL_BURST: Muitas solicitações simultâneas no servidor. Aguarde 1 minuto.';
  END IF;

  SELECT count(*)
    INTO v_global_5m_count
    FROM public.commercial_lead_rate_limits
   WHERE created_at > (timezone('utc', now()) - interval '5 minutes');

  IF v_global_5m_count >= 12 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_GLOBAL_LIMIT: Volume elevado de solicitações. Aguarde alguns minutos e tente novamente.';
  END IF;

  SELECT count(*)
    INTO v_email_10m_count
    FROM public.commercial_lead_rate_limits
   WHERE email_hash = v_email_hash
     AND created_at > (timezone('utc', now()) - interval '10 minutes');

  IF v_email_10m_count >= 1 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_RATE_LIMIT: Já recebemos uma solicitação para este e-mail nos últimos 10 minutos.';
  END IF;

  SELECT count(*)
    INTO v_email_24h_count
    FROM public.commercial_lead_rate_limits
   WHERE email_hash = v_email_hash
     AND created_at > (timezone('utc', now()) - interval '24 hours');

  IF v_email_24h_count >= 3 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_DAILY_LIMIT: Limite diário de solicitações para este e-mail atingido.';
  END IF;

  SELECT count(*)
    INTO v_workshop_10m_count
    FROM public.commercial_lead_rate_limits
   WHERE workshop_hash = v_workshop_hash
     AND created_at > (timezone('utc', now()) - interval '10 minutes');

  IF v_workshop_10m_count >= 2 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_WORKSHOP_RATE_LIMIT: Já recebemos solicitações recentes para esta oficina. Aguarde 10 minutos.';
  END IF;

  IF v_phone_hash IS NOT NULL THEN
    SELECT count(*)
      INTO v_phone_10m_count
      FROM public.commercial_lead_rate_limits
     WHERE phone_hash = v_phone_hash
       AND created_at > (timezone('utc', now()) - interval '10 minutes');

    IF v_phone_10m_count >= 2 THEN
      RAISE EXCEPTION 'SPAM_PROTECTION_PHONE_RATE_LIMIT: Já recebemos solicitações recentes para este telefone. Aguarde 10 minutos.';
    END IF;
  END IF;

  INSERT INTO public.commercial_lead_rate_limits (ip_hash, email_hash, workshop_hash, phone_hash)
  VALUES ('header-independent', v_email_hash, v_workshop_hash, v_phone_hash);

  v_effective_is_test := coalesce(p_is_test_submission, false)
    OR v_clean_email LIKE '%.exemplo.br'
    OR v_clean_email LIKE '%.invalid';

  v_protocol := 'SOL-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  INSERT INTO public.commercial_leads (
    protocol_code,
    intent_type,
    responsible_name,
    workshop_name,
    email,
    phone,
    portfolio_size,
    plan_interest,
    suggested_plan,
    notes,
    source_page,
    privacy_consent,
    is_test_submission
  ) VALUES (
    v_protocol,
    p_intent_type,
    v_clean_responsible,
    v_clean_workshop,
    v_clean_email,
    v_clean_phone,
    v_clean_portfolio,
    v_selected_plan,
    v_suggested_plan,
    v_clean_notes,
    left(coalesce(nullif(trim(p_source_page), ''), '/comercial.html'), 120),
    true,
    v_effective_is_test
  )
  RETURNING id, created_at
  INTO v_inserted_id, v_created_at;

  RETURN jsonb_build_object(
    'id', v_inserted_id,
    'protocolCode', v_protocol,
    'intentType', p_intent_type,
    'portfolioSize', v_clean_portfolio,
    'planInterest', v_selected_plan,
    'suggestedPlan', v_suggested_plan,
    'isTestSubmission', v_effective_is_test,
    'status', 'recebido_aguardando_contato',
    'createdAt', v_created_at
  );
END;
$$;

-- 4. Atualizar founder_list_commercial_leads para retornar tanto planInterest (escolha expressa)
--    quanto suggestedPlan (sugestão pelo porte da carteira)
CREATE OR REPLACE FUNCTION public.founder_list_commercial_leads(
  p_include_tests boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_real_total integer;
  v_real_pending integer;
  v_real_demos integer;
  v_real_pilots integer;
  v_real_paid integer;
  v_test_count integer;
  v_leads jsonb;
  v_pipeline jsonb;
BEGIN
  IF NOT public.is_authenticated_founder_admin() THEN
    RAISE EXCEPTION 'ACCESS_DENIED_FOUNDER_ONLY: Acesso restrito à conta autenticada do fundador.';
  END IF;

  SELECT
    count(*) FILTER (WHERE is_test_submission = false),
    count(*) FILTER (WHERE is_test_submission = false AND crm_status = 'recebido_aguardando_contato'),
    count(*) FILTER (WHERE is_test_submission = false AND intent_type = 'solicitar_demonstracao'),
    count(*) FILTER (WHERE is_test_submission = false AND intent_type = 'quero_participar_piloto'),
    count(*) FILTER (WHERE is_test_submission = false AND crm_status = 'piloto_pago_confirmado'),
    count(*) FILTER (WHERE is_test_submission = true)
  INTO
    v_real_total,
    v_real_pending,
    v_real_demos,
    v_real_pilots,
    v_real_paid,
    v_test_count
  FROM public.commercial_leads;

  SELECT coalesce(jsonb_agg(row_to_json(l)), '[]'::jsonb)
    INTO v_leads
    FROM (
      SELECT
        id,
        protocol_code AS "protocolCode",
        intent_type AS "intentType",
        responsible_name AS "responsibleName",
        workshop_name AS "workshopName",
        email,
        phone,
        portfolio_size AS "portfolioSize",
        plan_interest AS "planInterest",
        suggested_plan AS "suggestedPlan",
        notes,
        founder_notes AS "founderNotes",
        source_page AS "sourcePage",
        crm_status AS "crmStatus",
        is_test_submission AS "isTestSubmission",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM public.commercial_leads
      WHERE (p_include_tests = true OR is_test_submission = false)
      ORDER BY created_at DESC
      LIMIT 200
    ) l;

  SELECT coalesce(jsonb_agg(row_to_json(p)), '[]'::jsonb)
    INTO v_pipeline
    FROM (
      SELECT
        id,
        lead_code AS "leadCode",
        source_channel AS "sourceChannel",
        workshop_name AS "workshopName",
        responsible_name AS "responsibleName",
        city_uf AS "cityUf",
        email,
        phone,
        portfolio_size AS "portfolioSize",
        plan_interest AS "planInterest",
        suggested_plan AS "suggestedPlan",
        funnel_status AS "funnelStatus",
        demo_requested AS "demoRequested",
        payment_confirmed AS "paymentConfirmed",
        paid_amount_brl AS "paidAmountBrl",
        is_test_record AS "isTestRecord",
        notes,
        updated_at AS "updatedAt"
      FROM public.commercial_crm_pipeline
      WHERE (p_include_tests = true OR is_test_record = false)
      ORDER BY updated_at DESC
      LIMIT 200
    ) p;

  RETURN jsonb_build_object(
    'realCustomerIndicators', jsonb_build_object(
      'realLeadsTotal', coalesce(v_real_total, 0),
      'realPendingContact', coalesce(v_real_pending, 0),
      'realDemoRequests', coalesce(v_real_demos, 0),
      'realPilotRequests', coalesce(v_real_pilots, 0),
      'confirmedPaidPilots', coalesce(v_real_paid, 0),
      'excludedTechnicalTestRecords', coalesce(v_test_count, 0)
    ),
    'leads', v_leads,
    'crmPipeline', v_pipeline
  );
END;
$$;
