-- ==============================================================================
-- RenovaExt - Migração 11: Correção da checagem de service_role e founder admin
-- Data: 2026-11-16
-- Descrição:
--   Alinha a verificação de permissão administrativa em get_product_feedback_dashboard
--   e update_product_feedback_governance para checar auth.jwt() ->> 'role' = 'service_role'
--   ou public.is_authenticated_founder_admin().
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
  v_is_founder := (
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR public.is_authenticated_founder_admin()
  );

  IF NOT v_is_founder THEN
    RAISE EXCEPTION 'ACCESS_DENIED: apenas o fundador ou service_role pode acessar o painel de feedback';
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
  v_is_founder := (
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    OR coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    OR public.is_authenticated_founder_admin()
  );

  IF NOT v_is_founder THEN
    RAISE EXCEPTION 'ACCESS_DENIED: apenas o fundador ou service_role pode alterar governanca de feedback';
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
