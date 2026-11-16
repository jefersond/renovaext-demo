-- =============================================================================
-- RENOVAEXT MVP — MIGRAÇÃO 02: CONFIRMAÇÃO DE E-MAIL ATIVA POR PADRÃO +
-- PROVISIONAMENTO AUTOMÁTICO PÓS-CONFIRMAÇÃO E ISOLAMENTO DE CONTAS DEMO
-- =============================================================================

-- 1. Trigger SECURITY DEFINER que provisiona automaticamente a empresa (`companies`)
--    e o perfil (`profiles`) assim que o usuário confirma seu e-mail no Supabase Auth
--    (ou quando é criado já confirmado), lendo os metadados enviados no `signUp`.
create or replace function public.handle_auth_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_company_id uuid;
  v_new_company_id uuid;
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_company_name text := nullif(trim(coalesce(v_meta->>'company_name', '')), '');
  v_cnpj text := nullif(trim(coalesce(v_meta->>'cnpj', '')), '');
  v_responsible_name text := coalesce(nullif(trim(coalesce(v_meta->>'responsible_name', v_meta->>'full_name', '')), ''), split_part(new.email, '@', 1));
  v_phone text := coalesce(trim(coalesce(v_meta->>'phone', '')), '');
  v_city text := coalesce(nullif(trim(coalesce(v_meta->>'city', '')), ''), 'São Paulo');
  v_state text := upper(coalesce(nullif(trim(coalesce(v_meta->>'state', '')), ''), 'SP'));
  v_plan text := coalesce(v_meta->>'selected_plan_hypothesis', 'profissional_79');
begin
  -- Só provisiona a conta quando o e-mail estiver efetivamente confirmado!
  if new.email_confirmed_at is null then
    return new;
  end if;

  -- Verifica se o perfil já existe
  select company_id into v_existing_company_id
  from public.profiles
  where id = new.id
  limit 1;

  if v_existing_company_id is not null then
    return new;
  end if;

  -- Se o usuário se cadastrou pelo fluxo do RenovaExt (possui company_name nos metadados)
  if v_company_name is not null then
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
      v_company_name,
      v_cnpj,
      v_responsible_name,
      lower(trim(new.email)),
      v_phone,
      v_city,
      substring(v_state from 1 for 2),
      case when v_plan in ('inicial_49', 'profissional_79') then v_plan else 'profissional_79' end,
      false,
      false
    )
    returning id into v_new_company_id;

    insert into public.profiles (
      id,
      company_id,
      full_name,
      role,
      email
    ) values (
      new.id,
      v_new_company_id,
      v_responsible_name,
      'owner',
      lower(trim(new.email))
    );

    insert into public.audit_logs (
      company_id,
      actor_email,
      action,
      details
    ) values (
      v_new_company_id,
      lower(trim(new.email)),
      'COMPANY_CREATED',
      format('Conta da oficina "%s" ativada após confirmação de e-mail verificada.', v_company_name)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_on_auth_user_confirmed on auth.users;
create trigger trg_on_auth_user_confirmed
after insert or update of email_confirmed_at on auth.users
for each row
execute function public.handle_auth_user_confirmed();
