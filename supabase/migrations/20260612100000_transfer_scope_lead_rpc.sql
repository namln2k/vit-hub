create or replace function public.transfer_scope_lead(
  p_actor_id uuid,
  p_scope_type text,
  p_scope_id text,
  p_target_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_lead_role text;
  v_current_lead public.role_assignments%rowtype;
  v_membership_table text;
  v_scope_id_column text;
  v_target_status text;
  v_target_membership_exists boolean;
begin
  if p_scope_type = 'division' then
    v_lead_role := 'division_lead';
    v_membership_table := 'division_memberships';
    v_scope_id_column := 'division_id';
  elsif p_scope_type = 'group' then
    v_lead_role := 'group_lead';
    v_membership_table := 'group_memberships';
    v_scope_id_column := 'group_id';
  elsif p_scope_type = 'club' then
    v_lead_role := 'club_lead';
    v_membership_table := 'club_memberships';
    v_scope_id_column := 'club_id';
  else
    raise exception 'Scope type is not transferable.'
      using errcode = '22023';
  end if;

  select status
    into v_target_status
  from public."user"
  where id = p_target_user_id;

  if v_target_status is null then
    raise exception 'Target user was not found.'
      using errcode = 'P0002';
  end if;

  if v_target_status <> 'active' then
    raise exception 'Target user must be active.'
      using errcode = '42501';
  end if;

  select *
    into v_current_lead
  from public.role_assignments
  where scope_type = p_scope_type
    and scope_id = p_scope_id
    and role_key = v_lead_role
    and status = 'active'
    and starts_at <= v_now
    and (ends_at is null or ends_at > v_now)
  order by starts_at desc
  limit 1
  for update;

  if v_current_lead.id is null then
    raise exception 'Scope has no current lead to transfer.'
      using errcode = 'P0002';
  end if;

  if v_current_lead.user_id = p_target_user_id then
    return;
  end if;

  execute format(
    'select exists (
      select 1 from public.%I
      where %I = $1
        and user_id = $2
        and status = ''active''
        and starts_at <= $3
        and (ends_at is null or ends_at > $3)
    )',
    v_membership_table,
    v_scope_id_column
  )
  into v_target_membership_exists
  using p_scope_id::uuid, p_target_user_id, v_now;

  if not v_target_membership_exists then
    execute format(
      'insert into public.%I (%I, user_id, starts_at, status, source, added_by)
       values ($1, $2, $3, ''active'', ''role_assignment_auto'', $4)',
      v_membership_table,
      v_scope_id_column
    )
    using p_scope_id::uuid, p_target_user_id, v_now, p_actor_id;
  end if;

  update public.role_assignments
  set status = 'ended',
      ends_at = v_now,
      ended_by = p_actor_id,
      updated_at = v_now
  where id = v_current_lead.id;

  insert into public.role_assignments (
    user_id,
    role_key,
    scope_type,
    scope_id,
    starts_at,
    status,
    assigned_by
  )
  values (
    p_target_user_id,
    v_lead_role,
    p_scope_type,
    p_scope_id,
    v_now,
    'active',
    p_actor_id
  );
exception
  when exclusion_violation or unique_violation then
    raise exception 'Scope already has a conflicting lead interval.'
      using errcode = '23505';
end;
$$;

revoke execute on function public.transfer_scope_lead(uuid, text, text, uuid) from public;
revoke execute on function public.transfer_scope_lead(uuid, text, text, uuid) from anon;
revoke execute on function public.transfer_scope_lead(uuid, text, text, uuid) from authenticated;
grant execute on function public.transfer_scope_lead(uuid, text, text, uuid) to service_role;
