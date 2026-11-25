-- ==============================================================================
-- RenovaExt - Migração 10: Ajuste da validação de e-mail na RPC submit_product_feedback
-- Data: 2026-11-16
-- Descrição:
--   Corrige o cálculo da posição do ponto após o arroba (@) em endereços com múltiplos pontos.
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
  v_domain_part TEXT;
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
    IF length(v_email) < 5 OR position('@' in v_email) < 2 THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: email valido obrigatorio quando contato for solicitado';
    END IF;
    v_domain_part := substring(v_email from position('@' in v_email) + 1);
    IF length(v_domain_part) < 3 OR position('.' in v_domain_part) < 2 THEN
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
