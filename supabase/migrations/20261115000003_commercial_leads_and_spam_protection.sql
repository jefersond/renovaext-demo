-- ============================================================================
-- RENOVAEXT MVP — MIGRAÇÃO 03: CAPTAÇÃO SEGURA DE LEADS COMERCIAIS (SEPARADA DAS OFICINAS)
-- Arquivo: supabase/migrations/20261115000003_commercial_leads_and_spam_protection.sql
-- Objetivo:
--   1. Armazenar solicitações de demonstração e piloto ("Solicitar demonstração" /
--      "Quero participar do piloto") em tabela dedicada (public.commercial_leads),
--      100% separada das tabelas multi-tenant das oficinas (companies, clients, etc.).
--   2. Garantir controle estrito de acesso via RLS (nenhum visitante anônimo e
--      nenhuma oficina autenticada consegue listar/ler leads de terceiros).
--   3. Implementar proteção determinística contra spam (honeypot, tempo mínimo de
--      preenchimento, validação de formato e rate-limit por e-mail/janela temporal)
--      e registro explícito de consentimento da Política de Privacidade.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.commercial_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_code text NOT NULL UNIQUE,
  intent_type text NOT NULL CHECK (
    intent_type IN ('solicitar_demonstracao', 'quero_participar_piloto')
  ),
  responsible_name text NOT NULL CHECK (char_length(trim(responsible_name)) BETWEEN 2 AND 120),
  workshop_name text NOT NULL CHECK (char_length(trim(workshop_name)) BETWEEN 2 AND 160),
  email text NOT NULL CHECK (
    char_length(trim(email)) BETWEEN 5 AND 160
    AND email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  ),
  phone text,
  portfolio_size text NOT NULL CHECK (
    portfolio_size IN (
      'ate_50_clientes',
      '51_a_150_clientes',
      '151_a_300_clientes',
      '301_a_500_clientes',
      'mais_de_500_clientes'
    )
  ),
  plan_interest text NOT NULL CHECK (
    plan_interest IN ('inicial_49', 'profissional_79')
  ),
  notes text,
  source_page text NOT NULL DEFAULT '/comercial.html',
  privacy_consent boolean NOT NULL CHECK (privacy_consent = true),
  privacy_policy_version text NOT NULL DEFAULT '2026-11-v1',
  is_test_submission boolean NOT NULL DEFAULT false,
  crm_status text NOT NULL DEFAULT 'recebido_aguardando_contato' CHECK (
    crm_status IN (
      'recebido_aguardando_contato',
      'em_analise',
      'demonstracao_agendada',
      'piloto_em_ativacao',
      'arquivado'
    )
  ),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_email_created
  ON public.commercial_leads (lower(trim(email)), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_commercial_leads_created_at
  ON public.commercial_leads (created_at DESC);

-- ============================================================================
-- CONTROLE DE ACESSO (ROW LEVEL SECURITY)
-- Nenhuma policy SELECT/UPDATE/DELETE é concedida para 'anon' ou 'authenticated'.
-- Assim, visitantes públicos e oficinas logadas no sistema NUNCA conseguem ler
-- a tabela public.commercial_leads. Somente o administrador via service_role
-- (scripts de sincronização do CRM) possui leitura administrativa.
-- ============================================================================
ALTER TABLE public.commercial_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_leads FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.commercial_leads FROM anon, authenticated;

-- ============================================================================
-- RPC DE SUBMISSÃO SEGURA COM PROTEÇÃO CONTRA SPAM E COMPROVANTE DE PROTOCOLO
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
  v_clean_email text;
  v_clean_responsible text;
  v_clean_workshop text;
  v_clean_phone text;
  v_clean_notes text;
  v_recent_count integer;
  v_protocol text;
  v_inserted_id uuid;
  v_created_at timestamptz;
BEGIN
  -- 1. Proteção Anti-Bot Honeypot (campo oculto deve estar vazio)
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

  -- 4. Higienização e validação dos campos obrigatórios
  v_clean_email := lower(trim(coalesce(p_email, '')));
  v_clean_responsible := trim(coalesce(p_responsible_name, ''));
  v_clean_workshop := trim(coalesce(p_workshop_name, ''));
  v_clean_phone := nullif(trim(coalesce(p_phone, '')), '');
  v_clean_notes := left(nullif(trim(coalesce(p_notes, '')), ''), 1500);

  IF char_length(v_clean_responsible) < 2 THEN
    RAISE EXCEPTION 'INVALID_RESPONSIBLE_NAME: Informe o nome do responsável pela oficina.';
  END IF;

  IF char_length(v_clean_workshop) < 2 THEN
    RAISE EXCEPTION 'INVALID_WORKSHOP_NAME: Informe o nome da oficina.';
  END IF;

  IF v_clean_email !~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
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

  -- 5. Rate Limiting Anti-Spam: bloqueia múltiplos envios do mesmo e-mail em menos de 5 minutos
  SELECT count(*)
    INTO v_recent_count
    FROM public.commercial_leads
   WHERE lower(trim(email)) = v_clean_email
     AND created_at > (timezone('utc', now()) - interval '5 minutes');

  IF v_recent_count >= 2 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_RATE_LIMIT: Já recebemos uma solicitação recente para este e-mail. Aguarde alguns minutos antes de enviar novamente.';
  END IF;

  -- 6. Geração de protocolo verificável de recebimento
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

  RETURN jsonb_build_object(
    'id', v_inserted_id,
    'protocolCode', v_protocol,
    'intentType', p_intent_type,
    'responsibleName', v_clean_responsible,
    'workshopName', v_clean_workshop,
    'email', v_clean_email,
    'phone', v_clean_phone,
    'portfolioSize', p_portfolio_size,
    'planInterest', p_plan_interest,
    'status', 'recebido_aguardando_contato',
    'createdAt', v_created_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_commercial_lead(
  text, text, text, text, text, text, text, text, text, boolean, text, integer, boolean
) TO anon, authenticated;
