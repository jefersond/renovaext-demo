-- ============================================================================
-- RENOVAEXT MVP — MIGRAÇÃO 04: HARDENING DA RPC PÚBLICA, RATE LIMIT NO SERVIDOR,
-- SINCRONIZAÇÃO CONTÍNUA COM O CRM VIA TRIGGER E CONSULTA AUTENTICADA DO FUNDADOR
-- Arquivo: supabase/migrations/20261115000004_hardened_lead_rpc_and_founder_admin_view.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Colunas adicionais de acompanhamento do fundador em public.commercial_leads
ALTER TABLE public.commercial_leads
  ADD COLUMN IF NOT EXISTS founder_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT timezone('utc', now());

-- Expandir os status permitidos de acompanhamento no CRM
ALTER TABLE public.commercial_leads
  DROP CONSTRAINT IF EXISTS commercial_leads_crm_status_check;

ALTER TABLE public.commercial_leads
  ADD CONSTRAINT commercial_leads_crm_status_check CHECK (
    crm_status IN (
      'recebido_aguardando_contato',
      'em_analise',
      'demonstracao_agendada',
      'demonstracao_realizada',
      'proposta_piloto_enviada',
      'piloto_em_ativacao',
      'piloto_pago_confirmado',
      'objecao_registrada',
      'arquivado'
    )
  );

-- 2. Tabela interna de Rate Limiting Server-Side (sem dados pessoais, apenas hashes SHA-256)
CREATE TABLE IF NOT EXISTS public.commercial_lead_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  email_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_lead_rate_limits_ip_created
  ON public.commercial_lead_rate_limits (ip_hash, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_rate_limits_email_created
  ON public.commercial_lead_rate_limits (email_hash, created_at DESC);

ALTER TABLE public.commercial_lead_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_lead_rate_limits FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_lead_rate_limits FROM anon, authenticated;

-- 3. Tabela de Pipeline CRM Contínuo no PostgreSQL (Sincronizada automaticamente por Trigger)
CREATE TABLE IF NOT EXISTS public.commercial_crm_pipeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_code text NOT NULL UNIQUE,
  source_channel text NOT NULL CHECK (source_channel IN ('prospeccao_ativa_rodada_1', 'prospeccao_ativa_rodada_2', 'formulario_publico_inbound')),
  commercial_lead_id uuid REFERENCES public.commercial_leads(id) ON DELETE SET NULL,
  workshop_name text NOT NULL,
  responsible_name text,
  city_uf text,
  email text,
  phone text,
  portfolio_size text,
  plan_interest text NOT NULL DEFAULT 'profissional_79',
  funnel_status text NOT NULL DEFAULT 'aguardando_autorizacao_disparo',
  demo_requested boolean NOT NULL DEFAULT false,
  payment_confirmed boolean NOT NULL DEFAULT false,
  paid_amount_brl numeric(10,2),
  payment_receipt_id text,
  is_test_record boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.commercial_crm_pipeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_crm_pipeline FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.commercial_crm_pipeline FROM anon, authenticated;

-- Trigger que sincroniza CONTINUAMENTE cada submissão ou atualização em public.commercial_leads
-- para o pipeline do CRM (public.commercial_crm_pipeline), separando registros de teste (is_test_record).
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
    NEW.crm_status,
    true,
    (NEW.crm_status = 'piloto_pago_confirmado'),
    NEW.is_test_submission,
    coalesce(NEW.founder_notes, NEW.notes),
    NEW.created_at,
    timezone('utc', now())
  )
  ON CONFLICT (lead_code) DO UPDATE
  SET
    funnel_status = EXCLUDED.funnel_status,
    payment_confirmed = EXCLUDED.payment_confirmed,
    is_test_record = EXCLUDED.is_test_record,
    notes = coalesce(NEW.founder_notes, NEW.notes),
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_lead_to_crm_pipeline ON public.commercial_leads;
CREATE TRIGGER trg_sync_lead_to_crm_pipeline
  AFTER INSERT OR UPDATE ON public.commercial_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_commercial_lead_to_crm();

-- 4. Tabela de Controle de Acesso Exclusivo do Fundador (Sem service_role no navegador)
CREATE TABLE IF NOT EXISTS public.founder_admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.founder_admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_admin_users FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.founder_admin_users FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_authenticated_founder_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.founder_admin_users
     WHERE user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_authenticated_founder_admin() TO authenticated;

-- 5. Hardening da RPC pública submit_commercial_lead:
--    - Rate limit por IP Hash no servidor (extraído de request.headers do PostgREST)
--    - Rate limit por E-mail Hash no servidor (1 envio a cada 10 min; máx 3 em 24h)
--    - Disjuntor global anti-flood (máx 15 envios em 5 min)
--    - Bloqueio de injeção de links/HTML nos campos de nome
--    - Retorno sem exposição de dados pessoais (PII) no payload de resposta
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

  -- 5. Rate Limiting Server-Side (IP Hash + Email Hash + Global Burst)
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

  v_ip_hash := encode(digest(trim(v_raw_ip) || ':renovaext-rl-v1', 'sha256'), 'hex');
  v_email_hash := encode(digest(v_clean_email || ':renovaext-rl-v1', 'sha256'), 'hex');

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

-- 6. RPCs Autenticadas Exclusivas do Fundador para Consultar e Atualizar Interessados
--    (Operam com JWT normal do Supabase Auth do fundador, SEM service_role no navegador!)
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

CREATE OR REPLACE FUNCTION public.founder_update_commercial_lead_status(
  p_lead_id uuid,
  p_new_status text,
  p_founder_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated record;
BEGIN
  IF NOT public.is_authenticated_founder_admin() THEN
    RAISE EXCEPTION 'ACCESS_DENIED_FOUNDER_ONLY: Acesso restrito à conta autenticada do fundador.';
  END IF;

  IF p_new_status NOT IN (
    'recebido_aguardando_contato',
    'em_analise',
    'demonstracao_agendada',
    'demonstracao_realizada',
    'proposta_piloto_enviada',
    'piloto_em_ativacao',
    'piloto_pago_confirmado',
    'objecao_registrada',
    'arquivado'
  ) THEN
    RAISE EXCEPTION 'INVALID_CRM_STATUS: Status de acompanhamento inválido.';
  END IF;

  UPDATE public.commercial_leads
     SET crm_status = p_new_status,
         founder_notes = coalesce(nullif(trim(p_founder_notes), ''), founder_notes),
         updated_at = timezone('utc', now())
   WHERE id = p_lead_id
   RETURNING id, protocol_code, workshop_name, crm_status, updated_at
   INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'LEAD_NOT_FOUND: Registro comercial não encontrado.';
  END IF;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'protocolCode', v_updated.protocol_code,
    'workshopName', v_updated.workshop_name,
    'crmStatus', v_updated.crm_status,
    'updatedAt', v_updated.updated_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.founder_list_commercial_leads(boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.founder_update_commercial_lead_status(uuid, text, text) TO authenticated;
