-- ==============================================================================
-- RenovaExt - Migração 09: Escuta de Clientes, Sugestões de Melhoria e Feedback
-- Data: 2026-11-16
-- Descrição:
--   1. Criação da tabela independente `public.product_feedback_suggestions` com RLS.
--   2. RPC pública segura `public.submit_product_feedback` com proteção anti-spam,
--      validação de dados, detecção de categoria (anônimo, lead, piloto) e protocolo `FDB-...`.
--   3. RPCs administrativas restritas ao fundador para consulta analítica e governança.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.product_feedback_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_number VARCHAR(32) NOT NULL UNIQUE,
  primary_difficulty VARCHAR(64) NOT NULL,
  difficulty_other_detail TEXT,
  feature_wish TEXT NOT NULL,
  wants_contact BOOLEAN NOT NULL DEFAULT false,
  contact_email VARCHAR(255),
  contact_name VARCHAR(120),
  source_page VARCHAR(255),
  visitor_category VARCHAR(32) NOT NULL DEFAULT 'visitante_anonimo',
  linked_company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  linked_lead_id UUID REFERENCES public.commercial_leads(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'recebida',
  status_note TEXT,
  similarity_group VARCHAR(64),
  priority_score INTEGER NOT NULL DEFAULT 0,
  is_test_submission BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices operacionais e analíticos
CREATE INDEX IF NOT EXISTS idx_pfs_status ON public.product_feedback_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_pfs_similarity_group ON public.product_feedback_suggestions(similarity_group);
CREATE INDEX IF NOT EXISTS idx_pfs_primary_difficulty ON public.product_feedback_suggestions(primary_difficulty);
CREATE INDEX IF NOT EXISTS idx_pfs_visitor_category ON public.product_feedback_suggestions(visitor_category);
CREATE INDEX IF NOT EXISTS idx_pfs_created_at ON public.product_feedback_suggestions(created_at DESC);

-- Ativar RLS
ALTER TABLE public.product_feedback_suggestions ENABLE ROW LEVEL SECURITY;

-- Revogar permissões diretas de clientes públicos e anônimos (Zero exposição direta)
REVOKE ALL ON public.product_feedback_suggestions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.product_feedback_suggestions TO service_role;

-- Política de RLS para o Administrador Fundador autenticado
DROP POLICY IF EXISTS product_feedback_founder_admin_policy ON public.product_feedback_suggestions;
CREATE POLICY product_feedback_founder_admin_policy ON public.product_feedback_suggestions
  FOR ALL
  TO authenticated
  USING (public.is_authenticated_founder_admin())
  WITH CHECK (public.is_authenticated_founder_admin());

GRANT SELECT, UPDATE, DELETE ON public.product_feedback_suggestions TO authenticated;

-- ==============================================================================
-- RPC Pública: submit_product_feedback
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.submit_product_feedback(
  p_primary_difficulty TEXT,
  p_difficulty_other_detail TEXT DEFAULT NULL,
  p_feature_wish TEXT DEFAULT NULL,
  p_wants_contact BOOLEAN DEFAULT false,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_name TEXT DEFAULT NULL,
  p_source_page TEXT DEFAULT NULL,
  p_honeypot TEXT DEFAULT '',
  p_elapsed_ms INTEGER DEFAULT 0,
  p_is_test_submission BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_difficulty TEXT;
  v_other_detail TEXT;
  v_wish TEXT;
  v_email TEXT;
  v_name TEXT;
  v_source TEXT;
  v_wants_contact BOOLEAN;
  v_visitor_category VARCHAR(32) := 'visitante_anonimo';
  v_linked_company_id UUID := NULL;
  v_linked_lead_id UUID := NULL;
  v_protocol VARCHAR(32);
  v_new_id UUID;
BEGIN
  -- 1. Verificação de Honeypot anti-bot
  IF length(trim(coalesce(p_honeypot, ''))) > 0 THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_BOT_DETECTED: honeypot preenchido';
  END IF;

  -- 2. Verificação de tempo mínimo de preenchimento (>= 600ms para evitar scripts automáticos)
  IF p_elapsed_ms < 600 AND NOT coalesce(p_is_test_submission, false) THEN
    RAISE EXCEPTION 'SPAM_PROTECTION_TOO_FAST: tempo decorrido invalido';
  END IF;

  -- 3. Sanitização e validação da dificuldade primária
  v_difficulty := lower(trim(coalesce(p_primary_difficulty, '')));
  IF v_difficulty NOT IN ('organizar_planilhas', 'acompanhar_vencimentos', 'preparar_propostas', 'acompanhar_negociacoes', 'outra') THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: primary_difficulty invalida. Opcoes permitidas: organizar_planilhas, acompanhar_vencimentos, preparar_propostas, acompanhar_negociacoes, outra';
  END IF;

  v_other_detail := nullif(trim(coalesce(p_difficulty_other_detail, '')), '');
  IF v_difficulty = 'outra' AND length(coalesce(v_other_detail, '')) > 255 THEN
    v_other_detail := substr(v_other_detail, 1, 255);
  END IF;

  -- 4. Sanitização e validação do desejo de funcionalidade
  v_wish := trim(coalesce(p_feature_wish, ''));
  IF length(v_wish) < 5 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: feature_wish deve ter no minimo 5 caracteres';
  END IF;
  IF length(v_wish) > 2000 THEN
    v_wish := substr(v_wish, 1, 2000);
  END IF;

  -- 5. Tratamento de contato opcional
  v_wants_contact := coalesce(p_wants_contact, false);
  v_email := lower(trim(coalesce(p_contact_email, '')));
  v_name := trim(coalesce(p_contact_name, ''));

  IF v_wants_contact THEN
    IF length(v_email) < 5 OR position('@' in v_email) < 2 OR position('.' in substring(v_email from position('@' in v_email))) < 2 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: email valido obrigatorio quando contato for solicitado';
    END IF;
  ELSE
    -- Se não solicitou contato, limpa e-mail para garantia estrita de privacidade
    IF length(v_email) = 0 THEN
      v_email := NULL;
    END IF;
  END IF;

  IF length(v_name) = 0 THEN
    v_name := NULL;
  ELSIF length(v_name) > 120 THEN
    v_name := substr(v_name, 1, 120);
  END IF;

  v_source := nullif(trim(coalesce(p_source_page, '')), '');
  IF length(v_source) > 255 THEN
    v_source := substr(v_source, 1, 255);
  END IF;

  -- 6. Rate Limiting Server-Side (5 minutos)
  IF NOT coalesce(p_is_test_submission, false) THEN
    IF v_email IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.product_feedback_suggestions
        WHERE contact_email = v_email
          AND created_at > now() - interval '5 minutes'
      ) THEN
        RAISE EXCEPTION 'SPAM_PROTECTION_RATE_LIMIT: Ja recebemos seu feedback recentemente. Agradecemos sua colaboracao!';
      END IF;
    ELSE
      IF EXISTS (
        SELECT 1 FROM public.product_feedback_suggestions
        WHERE lower(feature_wish) = lower(v_wish)
          AND created_at > now() - interval '5 minutes'
      ) THEN
        RAISE EXCEPTION 'SPAM_PROTECTION_RATE_LIMIT: Sugestao identica recebida recentemente.';
      END IF;
    END IF;
  END IF;

  -- 7. Identificação contextual legítima da categoria de visitante
  IF v_email IS NOT NULL THEN
    -- Verifica se já é cliente/piloto cadastrado
    SELECT id INTO v_linked_company_id
    FROM public.companies
    WHERE lower(email) = v_email
    LIMIT 1;

    IF v_linked_company_id IS NOT NULL THEN
      v_visitor_category := 'empresa_piloto';
    ELSE
      -- Verifica se é um lead interessado existente no CRM comercial
      SELECT id INTO v_linked_lead_id
      FROM public.commercial_leads
      WHERE lower(email) = v_email
      LIMIT 1;

      IF v_linked_lead_id IS NOT NULL THEN
        v_visitor_category := 'lead_interessado';
      ELSE
        v_visitor_category := 'visitante_anonimo';
      END IF;
    END IF;
  ELSE
    v_visitor_category := 'visitante_anonimo';
  END IF;

  -- 8. Geração do Protocolo FDB-YYYYMMDD-XXXXXX
  v_protocol := 'FDB-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

  -- 9. Inserção do Registro
  INSERT INTO public.product_feedback_suggestions (
    protocol_number,
    primary_difficulty,
    difficulty_other_detail,
    feature_wish,
    wants_contact,
    contact_email,
    contact_name,
    source_page,
    visitor_category,
    linked_company_id,
    linked_lead_id,
    status,
    is_test_submission
  ) VALUES (
    v_protocol,
    v_difficulty,
    v_other_detail,
    v_wish,
    v_wants_contact,
    v_email,
    v_name,
    v_source,
    v_visitor_category,
    v_linked_company_id,
    v_linked_lead_id,
    'recebida',
    coalesce(p_is_test_submission, false)
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'protocolCode', v_protocol,
    'wantsContact', v_wants_contact,
    'visitorCategory', v_visitor_category,
    'id', v_new_id
  );
END;
$$;

-- Permitir execução anônima e autenticada da RPC de submissão
REVOKE ALL ON FUNCTION public.submit_product_feedback FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_product_feedback TO anon, authenticated, service_role;

-- ==============================================================================
-- RPC Administrativa: get_product_feedback_dashboard
-- Consulta analítica e agrupamento para o Fundador
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_product_feedback_dashboard()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_founder BOOLEAN := false;
  v_total INTEGER := 0;
  v_by_difficulty JSONB;
  v_by_category JSONB;
  v_by_status JSONB;
  v_by_similarity_group JSONB;
  v_recent_suggestions JSONB;
BEGIN
  -- Permite apenas ao fundador ou service_role
  IF current_user = 'service_role' OR public.is_authenticated_founder_admin() THEN
    v_is_founder := true;
  END IF;

  IF NOT v_is_founder THEN
    RAISE EXCEPTION 'ACCESS_DENIED: apenas o fundador pode acessar o painel de feedback';
  END IF;

  SELECT count(*) INTO v_total
  FROM public.product_feedback_suggestions
  WHERE is_test_submission = false;

  -- Agrupamento por Dificuldade Primária
  SELECT coalesce(jsonb_agg(d), '[]'::jsonb) INTO v_by_difficulty
  FROM (
    SELECT primary_difficulty, count(*) AS count
    FROM public.product_feedback_suggestions
    WHERE is_test_submission = false
    GROUP BY primary_difficulty
    ORDER BY count DESC
  ) d;

  -- Agrupamento por Categoria de Visitante
  SELECT coalesce(jsonb_agg(c), '[]'::jsonb) INTO v_by_category
  FROM (
    SELECT visitor_category, count(*) AS count
    FROM public.product_feedback_suggestions
    WHERE is_test_submission = false
    GROUP BY visitor_category
    ORDER BY count DESC
  ) c;

  -- Agrupamento por Status
  SELECT coalesce(jsonb_agg(s), '[]'::jsonb) INTO v_by_status
  FROM (
    SELECT status, count(*) AS count
    FROM public.product_feedback_suggestions
    WHERE is_test_submission = false
    GROUP BY status
    ORDER BY count DESC
  ) s;

  -- Agrupamento por Assunto Semelhante (Similarity Group)
  -- Mostra número de empresas distintas quando e-mail ou company_id existir
  SELECT coalesce(jsonb_agg(g), '[]'::jsonb) INTO v_by_similarity_group
  FROM (
    SELECT
      coalesce(similarity_group, 'sem_agrupamento') AS similarity_group,
      count(*) AS total_sugestoes,
      count(DISTINCT coalesce(contact_email, linked_company_id::text, id::text)) AS empresas_distintas,
      avg(priority_score) AS media_prioridade
    FROM public.product_feedback_suggestions
    WHERE is_test_submission = false
    GROUP BY similarity_group
    ORDER BY total_sugestoes DESC
  ) g;

  -- Últimas 50 sugestões detalhadas
  SELECT coalesce(jsonb_agg(r), '[]'::jsonb) INTO v_recent_suggestions
  FROM (
    SELECT
      id,
      protocol_number,
      primary_difficulty,
      difficulty_other_detail,
      feature_wish,
      wants_contact,
      contact_email,
      contact_name,
      visitor_category,
      status,
      status_note,
      similarity_group,
      priority_score,
      source_page,
      created_at
    FROM public.product_feedback_suggestions
    WHERE is_test_submission = false
    ORDER BY created_at DESC
    LIMIT 50
  ) r;

  RETURN jsonb_build_object(
    'total', v_total,
    'byDifficulty', v_by_difficulty,
    'byCategory', v_by_category,
    'byStatus', v_by_status,
    'bySimilarityGroup', v_by_similarity_group,
    'recent', v_recent_suggestions
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_feedback_dashboard FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_feedback_dashboard TO authenticated, service_role;

-- ==============================================================================
-- RPC Administrativa: update_product_feedback_governance
-- Atualiza status, agrupamento e prioridade de uma sugestão
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.update_product_feedback_governance(
  p_feedback_id UUID,
  p_status TEXT DEFAULT NULL,
  p_similarity_group TEXT DEFAULT NULL,
  p_priority_score INTEGER DEFAULT NULL,
  p_status_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_is_founder BOOLEAN := false;
  v_updated_id UUID;
BEGIN
  IF current_user = 'service_role' OR public.is_authenticated_founder_admin() THEN
    v_is_founder := true;
  END IF;

  IF NOT v_is_founder THEN
    RAISE EXCEPTION 'ACCESS_DENIED: apenas o fundador pode alterar governanca de feedback';
  END IF;

  UPDATE public.product_feedback_suggestions
  SET
    status = coalesce(p_status, status),
    similarity_group = coalesce(p_similarity_group, similarity_group),
    priority_score = coalesce(p_priority_score, priority_score),
    status_note = coalesce(p_status_note, status_note),
    updated_at = now()
  WHERE id = p_feedback_id
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'NOT_FOUND: sugestao nao encontrada';
  END IF;

  RETURN jsonb_build_object('success', true, 'id', v_updated_id);
END;
$$;

REVOKE ALL ON FUNCTION public.update_product_feedback_governance FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_product_feedback_governance TO authenticated, service_role;
