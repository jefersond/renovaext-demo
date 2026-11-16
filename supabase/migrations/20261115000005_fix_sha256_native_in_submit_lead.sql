-- ============================================================================
-- RENOVAEXT MVP — MIGRAÇÃO 05: USO DE SHA256 NATIVO DO POSTGRESQL (pg_catalog.sha256)
-- Arquivo: supabase/migrations/20261115000005_fix_sha256_native_in_submit_lead.sql
-- Corrige o cálculo de v_ip_hash e v_email_hash na função submit_commercial_lead
-- utilizando a função nativa pg_catalog.sha256(bytea) independente de search_path.
-- ============================================================================

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
  v_headers jsonb;
  v_raw_ip text;
  v_ip_hash text;
  v_email_hash text;
  v_clean_email text;
  v_clean_responsible text;
  v_clean_workshop text;
  v_clean_phone text;
  v_clean_notes text;
  v_ip_recent_count integer;
  v_email_10m_count integer;
  v_email_24h_count integer;
  v_global_5m_count integer;
  v_protocol text;
  v_inserted_id uuid;
  v_created_at timestamptz;
BEGIN
  -- 1. Proteção Anti-Bot Honeypot
  IF coalesce(trim(p_honeypot), '') <> '' THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_HONEYPOT: Submissão automatizada bloqueada.';
  END IF;

  -- 2. Proteção de tempo mínimo de preenchimento humano (>= 800ms)
  IF coalesce(p_elapsed_ms, 0) < 800 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_FAST_SUBMIT: Preenchimento muito rápido detectado. Aguarde alguns segundos e tente novamente.';
  END IF;

  -- 3. Verificação obrigatória de consentimento da Política de Privacidade
  IF coalesce(p_privacy_consent, false) IS NOT TRUE THEN
    RAISE EXCEPTION 'PRIVACY_CONSENT_REQUIRED: É obrigatório aceitar a Política de Privacidade para registrar a solicitação.';
  END IF;

  -- 4. Higienização e validação estrita dos campos
  v_clean_email := lower(trim(coalesce(p_email, '')));
  v_clean_responsible := trim(coalesce(p_responsible_name, ''));
  v_clean_workshop := trim(coalesce(p_workshop_name, ''));
  v_clean_phone := left(nullif(trim(coalesce(p_phone, '')), ''), 40);
  v_clean_notes := left(nullif(trim(coalesce(p_notes, '')), ''), 1000);

  IF char_length(v_clean_responsible) < 2 OR char_length(v_clean_responsible) > 120 THEN
    RAISE EXCEPTION 'INVALID_RESPONSIBLE_NAME: Informe o nome do responsável (2 a 120 caracteres).';
  END IF;

  IF char_length(v_clean_workshop) < 2 OR char_length(v_clean_workshop) > 160 THEN
    RAISE EXCEPTION 'INVALID_WORKSHOP_NAME: Informe o nome da oficina (2 a 160 caracteres).';
  END IF;

  -- Bloquear tags HTML ou URLs injetadas nos nomes
  IF v_clean_responsible ~* '(<|>|http://|https://|www\.)'
     OR v_clean_workshop ~* '(<|>|http://|https://|www\.)' THEN
    RAISE EXCEPTION 'INVALID_CHARACTERS_DETECTED: Caracteres ou links inválidos nos campos de identificação.';
  END IF;

  IF char_length(v_clean_email) > 160
     OR v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL: Informe um e-mail comercial válido.';
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

  -- 5. Rate Limiting Server-Side (IP Hash + Email Hash + Global Burst) usando pg_catalog.sha256 nativo
  BEGIN
    v_headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::jsonb;
  END;

  v_raw_ip := split_part(
    coalesce(
      v_headers ->> 'cf-connecting-ip',
      v_headers ->> 'x-forwarded-for',
      'local-client'
    ),
    ',',
    1
  );

  v_ip_hash := encode(pg_catalog.sha256(convert_to(trim(v_raw_ip) || ':renovaext-rl-v1', 'UTF8')), 'hex');
  v_email_hash := encode(pg_catalog.sha256(convert_to(v_clean_email || ':renovaext-rl-v1', 'UTF8')), 'hex');

  -- Limpeza oportunista de logs de rate-limit com mais de 24h
  DELETE FROM public.commercial_lead_rate_limits
   WHERE created_at < (timezone('utc', now()) - interval '24 hours');

  -- 5a. Disjuntor Global: máximo 15 submissões em 5 minutos
  SELECT count(*)
    INTO v_global_5m_count
    FROM public.commercial_lead_rate_limits
   WHERE created_at > (timezone('utc', now()) - interval '5 minutes');

  IF v_global_5m_count >= 15 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_GLOBAL_LIMIT: Volume elevado de solicitações. Aguarde alguns minutos e tente novamente.';
  END IF;

  -- 5b. Limite por E-mail: máximo 1 envio a cada 10 minutos e 3 em 24 horas
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

  -- 5c. Limite por IP Hash: máximo 4 submissões distintas da mesma origem em 10 minutos
  SELECT count(*)
    INTO v_ip_recent_count
    FROM public.commercial_lead_rate_limits
   WHERE ip_hash = v_ip_hash
     AND created_at > (timezone('utc', now()) - interval '10 minutes');

  IF v_ip_recent_count >= 4 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_IP_RATE_LIMIT: Muitas solicitações originadas desta conexão em curto período. Aguarde 10 minutos.';
  END IF;

  INSERT INTO public.commercial_lead_rate_limits (ip_hash, email_hash)
  VALUES (v_ip_hash, v_email_hash);

  -- 6. Geração de protocolo e gravação segura (dispara trg_sync_lead_to_crm_pipeline)
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
    coalesce(p_is_test_submission, false)
  )
  RETURNING id, created_at
  INTO v_inserted_id, v_created_at;

  -- Retorno mínimo sem expor dados pessoais (e-mail, telefone ou nome) no payload HTTP
  RETURN jsonb_build_object(
    'id', v_inserted_id,
    'protocolCode', v_protocol,
    'intentType', p_intent_type,
    'portfolioSize', p_portfolio_size,
    'planInterest', p_plan_interest,
    'isTestSubmission', coalesce(p_is_test_submission, false),
    'status', 'recebido_aguardando_contato',
    'createdAt', v_created_at
  );
END;
$$;
