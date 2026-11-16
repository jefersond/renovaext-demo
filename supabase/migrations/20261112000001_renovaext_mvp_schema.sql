-- =============================================================================
-- RENOVAEXT MVP — SCHEMA POSTGRESQL + ROW LEVEL SECURITY (RLS)
-- Arquivo: supabase/migrations/20261112000001_renovaext_mvp_schema.sql
-- Isolamento estrito por empresa (company_id) e separação total da Zuno/Zanotelli.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. TABELA DE EMPRESAS USUÁRIAS (OFICINAS DE EXTINTORES)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) >= 2),
  cnpj text,
  responsible_name text not null,
  email text not null,
  phone text not null,
  city text not null,
  state text not null default 'SP',
  selected_plan_hypothesis text not null default 'profissional_79'
    check (selected_plan_hypothesis in ('inicial_49', 'profissional_79')),
  billing_active boolean not null default false,
  default_proposal_validity_days integer not null default 15 check (default_proposal_validity_days between 1 and 90),
  default_proposal_notes text not null default 'Fornecemos extintores reserva durante a retirada para manutenção em oficina, mediante agendamento prévio.',
  is_demo_company boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. TABELA DE PERFIS / MEMBROS DA EMPRESA (PREPARADA PARA MÚLTIPLOS FUNCIONÁRIOS FUTUROS)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  role text not null default 'owner' check (role in ('owner', 'admin', 'staff')),
  email text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_company_id on public.profiles(company_id);

-- Função auxiliar determinística para obter o company_id do usuário autenticado
create or replace function public.current_user_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.profiles where id = auth.uid() limit 1;
$$;

-- 3. TABELA DE CLIENTES DA OFICINA (CARTEIRA)
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  organization_name text not null default '',
  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  city text not null default '',
  notes text not null default '',
  needs_review boolean not null default false,
  review_reason text,
  opportunity_stage text not null default 'pendente_conferencia'
    check (opportunity_stage in (
      'pendente_conferencia',
      'pronto_para_contato',
      'contatado',
      'proposta_preparada',
      'proposta_enviada',
      'aceito',
      'perdido'
    )),
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_company_id on public.clients(company_id);
create index if not exists idx_clients_opportunity_stage on public.clients(company_id, opportunity_stage);

-- 4. TABELA DE EQUIPAMENTOS REGISTRADOS POR CLIENTE
-- Nota: next_due_date NUNCA é inventado automaticamente; se ausente, needs_review = true.
create table if not exists public.equipments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  description text not null default '',
  extinguisher_type text not null default 'Não informado',
  capacity text,
  quantity integer not null default 1 check (quantity >= 1),
  last_service_date date,
  next_due_date date,
  needs_review boolean not null default false,
  review_notes text,
  notes text not null default '',
  dedupe_fingerprint text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, dedupe_fingerprint)
);

create index if not exists idx_equipments_company_id on public.equipments(company_id);
create index if not exists idx_equipments_client_id on public.equipments(client_id);
create index if not exists idx_equipments_next_due_date on public.equipments(company_id, next_due_date);

-- 5. TABELA DE HISTÓRICO DE SERVIÇOS REGISTRADOS
create table if not exists public.service_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_date date not null,
  description text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_service_history_company_client on public.service_history(company_id, client_id);

-- 6. TABELA DE MOVIMENTAÇÕES DO FUNIL COMERCIAL (OPORTUNIDADES)
create table if not exists public.opportunity_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  from_stage text,
  to_stage text not null check (to_stage in (
    'pendente_conferencia',
    'pronto_para_contato',
    'contatado',
    'proposta_preparada',
    'proposta_enviada',
    'aceito',
    'perdido'
  )),
  note text not null default '',
  changed_by text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_opportunity_history_company_client on public.opportunity_history(company_id, client_id);

-- 7. TABELA DE PROPOSTAS COMERCIAIS (PREÇOS SEMPRE EDITÁVEIS PELO USUÁRIO)
create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  proposal_number text not null,
  status text not null default 'gerada'
    check (status in ('rascunho', 'gerada', 'enviada', 'aceita', 'perdida')),
  validity_days integer not null default 15 check (validity_days between 1 and 90),
  items jsonb not null default '[]'::jsonb,
  total_brl numeric(12,2) not null default 0 check (total_brl >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proposals_company_id on public.proposals(company_id);
create index if not exists idx_proposals_client_id on public.proposals(client_id);

-- 8. TABELA DE LOGS DE AUDITORIA E ERROS
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_email text not null,
  action text not null,
  details text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company_id on public.audit_logs(company_id, created_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — ISOLAMENTO MULTI-TENANT ESTRITO POR EMPRESA
-- =============================================================================

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.equipments enable row level security;
alter table public.service_history enable row level security;
alter table public.opportunity_history enable row level security;
alter table public.proposals enable row level security;
alter table public.audit_logs enable row level security;

-- Políticas para companies
create policy "companies_select_own" on public.companies
  for select using (id = public.current_user_company_id());

create policy "companies_update_own" on public.companies
  for update using (id = public.current_user_company_id())
  with check (id = public.current_user_company_id());

-- Políticas para profiles
create policy "profiles_select_own_company" on public.profiles
  for select using (company_id = public.current_user_company_id());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and company_id = public.current_user_company_id());

-- Políticas para clients
create policy "clients_all_own_company" on public.clients
  for all using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

-- Políticas para equipments
create policy "equipments_all_own_company" on public.equipments
  for all using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

-- Políticas para service_history
create policy "service_history_all_own_company" on public.service_history
  for all using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

-- Políticas para opportunity_history
create policy "opportunity_history_all_own_company" on public.opportunity_history
  for all using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

-- Políticas para proposals
create policy "proposals_all_own_company" on public.proposals
  for all using (company_id = public.current_user_company_id())
  with check (company_id = public.current_user_company_id());

-- Políticas para audit_logs
create policy "audit_logs_select_own_company" on public.audit_logs
  for select using (company_id = public.current_user_company_id());

create policy "audit_logs_insert_own_company" on public.audit_logs
  for insert with check (company_id = public.current_user_company_id());

-- Função RPC Segura (SECURITY DEFINER) para criar empresa + perfil no ato do cadastro autenticado
create or replace function public.bootstrap_company_account(
  p_company_name text,
  p_cnpj text,
  p_responsible_name text,
  p_email text,
  p_phone text,
  p_city text,
  p_state text,
  p_selected_plan text default 'profissional_79',
  p_is_demo boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_company_id uuid;
  v_new_company_id uuid;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED: Usuário não autenticado.';
  end if;

  select company_id into v_existing_company_id
  from public.profiles
  where id = v_user_id
  limit 1;

  if v_existing_company_id is not null then
    return v_existing_company_id;
  end if;

  insert into public.companies (
    name,
    cnpj,
    responsible_name,
    email,
    phone,
    city,
    state,
    selected_plan_hypothesis,
    billing_active,
    is_demo_company
  ) values (
    trim(p_company_name),
    nullif(trim(coalesce(p_cnpj, '')), ''),
    trim(p_responsible_name),
    lower(trim(p_email)),
    trim(p_phone),
    coalesce(nullif(trim(p_city), ''), 'São Paulo'),
    upper(coalesce(nullif(trim(p_state), ''), 'SP')),
    case when p_selected_plan in ('inicial_49', 'profissional_79') then p_selected_plan else 'profissional_79' end,
    false,
    coalesce(p_is_demo, false)
  )
  returning id into v_new_company_id;

  insert into public.profiles (
    id,
    company_id,
    full_name,
    role,
    email
  ) values (
    v_user_id,
    v_new_company_id,
    trim(p_responsible_name),
    'owner',
    lower(trim(p_email))
  );

  insert into public.audit_logs (
    company_id,
    actor_email,
    action,
    details
  ) values (
    v_new_company_id,
    lower(trim(p_email)),
    'COMPANY_CREATED',
    format('Empresa "%s" registrada no Supabase Staging com isolamento RLS.', trim(p_company_name))
  );

  return v_new_company_id;
end;
$$;

grant execute on function public.bootstrap_company_account(text, text, text, text, text, text, text, text, boolean) to authenticated;

-- Storage Bucket Privado para Planilhas Importadas e PDFs (Opcional / Isolado)
insert into storage.buckets (id, name, public, file_size_limit)
values ('renovaext-private', 'renovaext-private', false, 5242880)
on conflict (id) do nothing;
