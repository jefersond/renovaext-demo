-- ==============================================================================
-- RenovaExt - Migração: Conformidade LGPD, Expurgo Seguro e Retenção de Leads
-- Data: 2026-11-16 (Auditada e Endurecida contra Solicitações Anônimas)
-- ==============================================================================

-- 1. Tabela de Log de Auditoria LGPD (Rastreabilidade de Expurgo)
CREATE TABLE IF NOT EXISTS public.commercial_lead_privacy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requested_email_hash TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('PURGE_REQUESTED', 'PURGE_EXECUTED', 'ANONYMIZED', 'EXPIRED_CLEANUP')),
    operator_role TEXT NOT NULL,
    operator_user_id UUID,
    notes TEXT,
    records_affected INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.commercial_lead_privacy_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_lead_privacy_logs FORCE ROW LEVEL SECURITY;

-- Revogar acesso público e anônimo da tabela de logs de privacidade
REVOKE ALL ON public.commercial_lead_privacy_logs FROM anon, authenticated;

-- Apenas service_role ou administradores fundadores autenticados podem consultar logs
CREATE POLICY privacy_logs_admin_policy ON public.commercial_lead_privacy_logs
    FOR ALL
    USING (
      coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      OR public.is_authenticated_founder_admin()
    );

-- 2. Função de Expurgo Seguro de Leads por E-mail (Direito ao Esquecimento - Art. 18 LGPD)
--    SEGURANÇA ESTRITA: Exige autenticação de administrador fundador OU service_role.
--    PROIBIDO para usuários anônimos (impede expurgo malicioso de dados de terceiros).
CREATE OR REPLACE FUNCTION public.purge_commercial_lead_by_email(
    target_email TEXT,
    operator_note TEXT DEFAULT 'Solicitacao do titular via canal oficial de privacidade'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    normalized_email TEXT;
    email_h TEXT;
    deleted_leads_count INTEGER := 0;
    anonymized_pipeline_count INTEGER := 0;
    is_admin BOOLEAN := false;
BEGIN
    -- 1. Verificação rigorosa de autorização administrativa
    is_admin := (
        coalesce(auth.jwt() ->> 'role', '') = 'service_role'
        OR public.is_authenticated_founder_admin()
    );

    IF NOT is_admin THEN
        RAISE EXCEPTION 'ACCESS_DENIED_LGPD_PURGE: Operacao restrita ao administrador fundador autenticado ou service_role.';
    END IF;

    -- 2. Normalização e validação do e-mail alvo
    normalized_email := lower(trim(target_email));
    
    IF normalized_email IS NULL OR position('@' in normalized_email) = 0 OR char_length(normalized_email) > 160 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'E-mail invalido para operacao de privacidade.'
        );
    END IF;

    -- 3. Gerar hash SHA-256 para registro de auditoria sem persistir dado pessoal em claro
    email_h := encode(extensions.digest(normalized_email, 'sha256'), 'hex');

    -- 4. Anonimizar o CRM pipeline preservando histórico de conversão e integridade de métricas
    --    (Substitui PII por identificadores anônimos conforme previsto no Art. 18 c/c Art. 16 da LGPD)
    WITH pipeline_to_anonymize AS (
        SELECT id FROM public.commercial_crm_pipeline
        WHERE lower(trim(email)) = normalized_email
    ),
    anonymized_pipeline AS (
        UPDATE public.commercial_crm_pipeline
        SET
            workshop_name = 'TITULAR_EXPURGADO_LGPD',
            responsible_name = 'ANONIMIZADO',
            email = NULL,
            phone = NULL,
            notes = 'Dados pessoais expurgados a pedido do titular conforme Art. 18 da LGPD.',
            funnel_status = 'arquivado',
            updated_at = timezone('utc'::text, now())
        WHERE id IN (SELECT id FROM pipeline_to_anonymize)
        RETURNING id
    )
    SELECT count(*) INTO anonymized_pipeline_count FROM anonymized_pipeline;

    -- 5. Excluir os registros brutos de submissão da tabela commercial_leads
    WITH deleted_leads AS (
        DELETE FROM public.commercial_leads
        WHERE lower(trim(email)) = normalized_email
        RETURNING id
    )
    SELECT count(*) INTO deleted_leads_count FROM deleted_leads;

    -- 6. Registrar log auditável de privacidade
    INSERT INTO public.commercial_lead_privacy_logs (
        requested_email_hash,
        action,
        operator_role,
        operator_user_id,
        records_affected,
        notes
    ) VALUES (
        email_h,
        'PURGE_EXECUTED',
        coalesce(auth.jwt() ->> 'role', 'authenticated_founder'),
        auth.uid(),
        deleted_leads_count + anonymized_pipeline_count,
        operator_note || ' [Leads removidos: ' || deleted_leads_count::text || ', CRM anonimizados: ' || anonymized_pipeline_count::text || ']'
    );

    RETURN jsonb_build_object(
        'success', true,
        'deletedLeads', deleted_leads_count,
        'anonymizedPipelineEntries', anonymized_pipeline_count,
        'emailHash', email_h,
        'privacyStatus', 'DADOS_EXPURGADOS_E_ANONIMIZADOS_CONFORME_LGPD'
    );
END;
$$;

-- Revogar permissão pública/anônima e conceder apenas a autenticados e service_role
REVOKE ALL ON FUNCTION public.purge_commercial_lead_by_email(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purge_commercial_lead_by_email(TEXT, TEXT) TO authenticated, service_role;

-- 3. Função de Limpeza Automática de Leads Antigos (Retenção Máxima de 180 Dias sem Conversão)
--    SEGURANÇA ESTRITA: Exige autenticação de administrador fundador OU service_role.
CREATE OR REPLACE FUNCTION public.cleanup_expired_stale_leads(
    retention_days INTEGER DEFAULT 180
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    purged_count INTEGER := 0;
    is_admin BOOLEAN := false;
BEGIN
    is_admin := (
        coalesce(auth.jwt() ->> 'role', '') = 'service_role'
        OR public.is_authenticated_founder_admin()
    );

    IF NOT is_admin THEN
        RAISE EXCEPTION 'ACCESS_DENIED_RETENTION_CLEANUP: Operacao restrita ao administrador fundador autenticado ou service_role.';
    END IF;

    -- Expurgar leads antigos de commercial_leads que não viraram pilotos pagos nem estão em contato ativo
    WITH expired AS (
        DELETE FROM public.commercial_leads
        WHERE created_at < (timezone('utc'::text, now()) - (retention_days || ' days')::INTERVAL)
          AND crm_status NOT IN ('piloto_em_ativacao', 'piloto_pago_confirmado')
        RETURNING id
    )
    SELECT count(*) INTO purged_count FROM expired;

    IF purged_count > 0 THEN
        INSERT INTO public.commercial_lead_privacy_logs (
            requested_email_hash,
            action,
            operator_role,
            operator_user_id,
            records_affected,
            notes
        ) VALUES (
            'RETENTION_BATCH_' || to_char(timezone('utc'::text, now()), 'YYYYMMDD'),
            'EXPIRED_CLEANUP',
            coalesce(auth.jwt() ->> 'role', 'authenticated_founder'),
            auth.uid(),
            purged_count,
            'Limpeza automatica de retencao para leads inativos ha mais de ' || retention_days::text || ' dias.'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'purgedCount', purged_count,
        'retentionPolicyDays', retention_days
    );
END;
$$;

-- Revogar permissão pública/anônima e conceder apenas a autenticados e service_role
REVOKE ALL ON FUNCTION public.cleanup_expired_stale_leads(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_stale_leads(INTEGER) TO authenticated, service_role;
