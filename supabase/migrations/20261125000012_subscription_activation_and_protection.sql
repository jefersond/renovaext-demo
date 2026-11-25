-- =============================================================================
-- RENOVAEXT — MIGRAÇÃO 12: LIMITES DE PLANO NO BACKEND, ATIVAÇÃO SEGURA DE ASSINATURA,
-- IDEMPOTÊNCIA STRIPE ISOLADA E SUPORTE AOS 30 ALVOS NO CRM COMERCIAL
-- Arquivo: supabase/migrations/20261125000012_subscription_activation_and_protection.sql
--
-- ROLLBACK SEGURO (SE NECESSÁRIO):
--   drop trigger if exists trg_enforce_company_client_plan_limit on public.clients;
--   drop function if exists public.enforce_company_client_plan_limit();
--   drop trigger if exists trg_protect_company_billing_columns on public.companies;
--   drop function if exists public.protect_company_billing_columns();
--   revoke all on function public.founder_activate_company_subscription(text, text, text, integer, text) from authenticated, service_role;
-- =============================================================================

-- 1. Colunas de assinatura e vínculo Stripe exclusivo do RenovaExt em public.companies
alter table public.companies
  add column if not exists subscription_status text not null default 'aguardando_ativacao'
    check (subscription_status in ('aguardando_ativacao', 'piloto_ativo', 'assinatura_ativa', 'cancelado')),
  add column if not exists pilot_started_at timestamptz,
  add column if not exists pilot_ends_at timestamptz,
  add column if not exists payment_reference text,
  add column if not exists activated_at timestamptz,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- 2. Proteção estrita contra alteração direta de colunas financeiras pelo cliente autenticado
create or replace function public.protect_company_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', current_user);
begin
  if v_role = 'service_role' or public.is_authenticated_founder_admin() then
    return new;
  end if;

  if new.billing_active is distinct from old.billing_active
     or new.subscription_status is distinct from old.subscription_status
     or new.pilot_started_at is distinct from old.pilot_started_at
     or new.pilot_ends_at is distinct from old.pilot_ends_at
     or new.payment_reference is distinct from old.payment_reference
     or new.activated_at is distinct from old.activated_at
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.stripe_subscription_id is distinct from old.stripe_subscription_id then
    raise exception 'BILLING_COLUMN_PROTECTED: Apenas a administração do RenovaExt ou o webhook financeiro autorizado podem alterar o status da assinatura.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_company_billing_columns on public.companies;
create trigger trg_protect_company_billing_columns
  before update on public.companies
  for each row
  execute function public.protect_company_billing_columns();

-- 3. Enforcement REAL dos limites de carteira no BACKEND PostgreSQL (150 Inicial / 500 Profissional)
create or replace function public.enforce_company_client_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_max_clients integer;
  v_current_count integer;
begin
  select selected_plan_hypothesis
    into v_plan
    from public.companies
   where id = new.company_id;

  v_max_clients := case
    when v_plan = 'inicial_49' then 150
    else 500
  end;

  select count(*)
    into v_current_count
    from public.clients
   where company_id = new.company_id;

  if v_current_count >= v_max_clients then
    raise exception 'PLAN_CLIENT_LIMIT_EXCEEDED: Limite de carteira do plano (% clientes) atingido para esta oficina.', v_max_clients;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_company_client_plan_limit on public.clients;
create trigger trg_enforce_company_client_plan_limit
  before insert on public.clients
  for each row
  execute function public.enforce_company_client_plan_limit();

-- 4. RPC administrativa para ativação de assinatura / piloto após confirmação financeira real
create or replace function public.founder_activate_company_subscription(
  p_company_email text,
  p_plan text,
  p_status text default 'piloto_ativo',
  p_duration_days integer default 30,
  p_payment_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(auth.jwt() ->> 'role', current_user);
  v_company public.companies%rowtype;
  v_billing_active boolean;
  v_now timestamptz := now();
  v_ends_at timestamptz;
begin
  if not (v_role = 'service_role' or public.is_authenticated_founder_admin()) then
    raise exception 'FORBIDDEN: Acesso restrito ao fundador do RenovaExt.';
  end if;

  if p_plan not in ('inicial_49', 'profissional_79') then
    raise exception 'INVALID_PLAN: Informe inicial_49 ou profissional_79.';
  end if;

  if p_status not in ('aguardando_ativacao', 'piloto_ativo', 'assinatura_ativa', 'cancelado') then
    raise exception 'INVALID_STATUS: Status de assinatura inválido.';
  end if;

  v_billing_active := p_status in ('piloto_ativo', 'assinatura_ativa');
  v_ends_at := case
    when v_billing_active then v_now + make_interval(days => greatest(1, least(365, coalesce(p_duration_days, 30))))
    else null
  end;

  update public.companies
  set
    selected_plan_hypothesis = p_plan,
    billing_active = v_billing_active,
    subscription_status = p_status,
    pilot_started_at = case when p_status = 'piloto_ativo' and pilot_started_at is null then v_now else pilot_started_at end,
    pilot_ends_at = v_ends_at,
    payment_reference = coalesce(nullif(trim(p_payment_reference), ''), payment_reference),
    activated_at = case when v_billing_active then v_now else activated_at end,
    updated_at = v_now
  where lower(email) = lower(trim(p_company_email))
    and is_demo_company = false
  returning * into v_company;

  if not found then
    raise exception 'COMPANY_NOT_FOUND: Nenhuma oficina real encontrada para o e-mail informado.';
  end if;

  insert into public.audit_logs (
    company_id,
    actor_email,
    action,
    details
  ) values (
    v_company.id,
    'founder-admin',
    'COMPANY_UPDATED',
    format(
      'Assinatura atualizada pelo fundador: plano=%s, status=%s, billing_active=%s, ref=%s.',
      p_plan,
      p_status,
      v_billing_active,
      coalesce(nullif(trim(p_payment_reference), ''), 'sem_ref')
    )
  );

  return jsonb_build_object(
    'ok', true,
    'companyId', v_company.id,
    'companyName', v_company.name,
    'email', v_company.email,
    'plan', v_company.selected_plan_hypothesis,
    'subscriptionStatus', v_company.subscription_status,
    'billingActive', v_company.billing_active,
    'validUntil', v_company.pilot_ends_at
  );
end;
$$;

revoke all on function public.founder_activate_company_subscription(text, text, text, integer, text) from public;
revoke all on function public.founder_activate_company_subscription(text, text, text, integer, text) from anon;
grant execute on function public.founder_activate_company_subscription(text, text, text, integer, text) to authenticated, service_role;

-- 5. Tabela isolada de eventos Stripe exclusivos do RenovaExt (idempotência + auditoria)
create table if not exists public.renovaext_stripe_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  is_test_mode boolean not null default true,
  company_id uuid references public.companies(id) on delete set null,
  customer_email text,
  plan_code text check (plan_code in ('inicial_49', 'profissional_79')),
  amount_brl numeric(10,2),
  processing_status text not null default 'processed'
    check (processing_status in ('processed', 'ignored_other_product', 'company_not_found', 'error')),
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.renovaext_stripe_events enable row level security;
alter table public.renovaext_stripe_events force row level security;
revoke all on public.renovaext_stripe_events from anon, authenticated;

-- 6. Expansão aditiva de public.commercial_crm_pipeline para suportar as 3 ondas de 30 alvos verificados
alter table public.commercial_crm_pipeline
  drop constraint if exists commercial_crm_pipeline_source_channel_check;

alter table public.commercial_crm_pipeline
  add constraint commercial_crm_pipeline_source_channel_check
  check (source_channel in (
    'prospeccao_ativa_rodada_1',
    'prospeccao_ativa_rodada_2',
    'prospeccao_ativa_rodada_3',
    'formulario_publico_inbound'
  ));

alter table public.commercial_crm_pipeline
  add column if not exists website_url text,
  add column if not exists eligible_channel text default 'whatsapp_manual',
  add column if not exists personalization_hook text,
  add column if not exists outreach_draft_subject text,
  add column if not exists outreach_draft_body text,
  add column if not exists opt_out boolean not null default false,
  add column if not exists suggested_plan text not null default 'profissional_79';
