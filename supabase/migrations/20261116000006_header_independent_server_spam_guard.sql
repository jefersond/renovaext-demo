-- ============================================================================
-- RENOVAEXT MVP — MIGRAÇÃO 06: PROTEÇÃO ANTI-SPAM 100% SERVER-SIDE INDEPENDENTE
-- DE CABEÇALHOS HTTP FALSIFICÁVEIS (X-Forwarded-For / User-Agent)
-- Arquivo: supabase/migrations/20261116000006_header_independent_server_spam_guard.sql
-- ============================================================================

ALTER TABLE public.commercial_lead_rate_limits
  ADD COLUMN IF NOT EXISTS workshop_hash text,
  ADD COLUMN IF NOT EXISTS phone_hash text;

CREATE INDEX IF NOT EXISTS idx_lead_rate_limits_workshop_created
  ON public.commercial_lead_rate_limits (workshop_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_rate_limits_phone_created
  ON public.commercial_lead_rate_limits (phone_hash, created_at DESC);

CREATE OR REPLACE FUNCTION public.submit_commercial_lead(
  p_intent_type text,
  p_responsible_name text,
  p_workshop_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_portfolio_size text DEFAULT 'ate_50_clientes',
  p_plan_interest text DEFAULT 'inicial_49',
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

  -- Bloquear tags HTML, scripts ou URLs nos campos de identificação e observações
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

  IF p_intent_type NOT IN ('solicitar_demonstracao', 'quero_participar_piloto') THEN
    RAISE EXCEPTION 'INVALID_INTENT_TYPE: Tipo de solicitação inválido.';
  END IF;

  IF p_portfolio_size NOT IN (
    'ate_50_clientes',
    '51_a_150_clientes',
    '151_a_300_clientes',
    '301_a_500_clientes',
    'mais_de_500_clientes'
  ) THEN
    RAISE EXCEPTION 'INVALID_PORTFOLIO_SIZE: Selecione uma faixa válida de tamanho da carteira.';
  END IF;

  IF p_plan_interest NOT IN ('inicial_49', 'profissional_79') THEN
    RAISE EXCEPTION 'INVALID_PLAN_INTEREST: Selecione o plano de interesse (R$ 49 ou R$ 79).';
  END IF;

  -- 5. Rate Limiting 100% Server-Side (Independente de cabeçalhos HTTP falsificáveis como X-Forwarded-For)
  v_email_hash := encode(pg_catalog.sha256(convert_to(v_clean_email || ':renovaext-rl-v2', 'UTF8')), 'hex');
  v_workshop_hash := encode(pg_catalog.sha256(convert_to(v_normalized_workshop || ':renovaext-rl-v2', 'UTF8')), 'hex');
  v_phone_hash := CASE
    WHEN v_phone_digits IS NOT NULL THEN encode(pg_catalog.sha256(convert_to(v_phone_digits || ':renovaext-rl-v2', 'UTF8')), 'hex')
    ELSE NULL
  END;

  DELETE FROM public.commercial_lead_rate_limits
   WHERE created_at < (timezone('utc', now()) - interval '24 hours');

  -- 5a. Disjuntor Global por Relógio do Servidor (1 min e 5 min) — independe totalmente de cabeçalhos HTTP
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

  -- 5b. Limite por E-mail (1 a cada 10 min; máx 3 em 24h)
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

  -- 5c. Limite por Oficina Normalizada (bloqueia bot trocando e-mail para a mesma oficina)
  SELECT count(*)
    INTO v_workshop_10m_count
    FROM public.commercial_lead_rate_limits
   WHERE workshop_hash = v_workshop_hash
     AND created_at > (timezone('utc', now()) - interval '10 minutes');

  IF v_workshop_10m_count >= 2 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_WORKSHOP_RATE_LIMIT: Já recebemos solicitações recentes para esta oficina. Aguarde 10 minutos.';
  END IF;

  -- 5d. Limite por Telefone Normalizado (quando informado)
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

  -- 6. Classificação estrita de registro de teste no servidor (domínios .exemplo.br ou .invalid)
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
    p_portfolio_size,
    p_plan_interest,
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
    'portfolioSize', p_portfolio_size,
    'planInterest', p_plan_interest,
    'isTestSubmission', v_effective_is_test,
    'status', 'recebido_aguardando_contato',
    'createdAt', v_created_at
  );
END;
$$;
