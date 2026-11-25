-- =============================================================================
-- RenovaExt — Auditoria da Ponte Somente-Leitura para Zanotelli OS (v1)
-- Reutiliza public.commercial_leads e public.commercial_crm_pipeline sem criar outro CRM.
-- Nenhuma policy é aberta para anon/authenticated.
-- =============================================================================

begin;

create table if not exists public.readonly_bridge_access_logs (
  id uuid primary key default gen_random_uuid(),
  consumer_name text not null default 'zanotelli-os',
  request_method text not null,
  status_code integer not null,
  leads_returned integer not null default 0,
  pipeline_returned integer not null default 0,
  safe_note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_readonly_bridge_access_logs_created_at
  on public.readonly_bridge_access_logs (created_at desc);

alter table public.readonly_bridge_access_logs enable row level security;
alter table public.readonly_bridge_access_logs force row level security;

revoke all on public.readonly_bridge_access_logs from public, anon, authenticated;

commit;
