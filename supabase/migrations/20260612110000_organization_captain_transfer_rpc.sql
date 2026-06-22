create or replace function public.transfer_organization_captain(
  p_actor_id uuid,
  p_target_user_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_current_captain public.role_assignments%rowtype;
  v_target_status text;
begin
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
    into v_current_captain
  from public.role_assignments
  where scope_type = 'organization'
    and scope_id is null
    and role_key = 'captain'
    and status = 'active'
    and starts_at <= v_now
    and (ends_at is null or ends_at > v_now)
  order by starts_at desc
  limit 1
  for update;

  if v_current_captain.id is null then
    raise exception 'Organization has no current captain to transfer.'
      using errcode = 'P0002';
  end if;

  if v_current_captain.user_id = p_target_user_id then
    return;
  end if;

  update public.role_assignments
  set status = 'ended',
      ends_at = v_now,
      ended_by = p_actor_id,
      updated_at = v_now
  where id = v_current_captain.id;

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
    'captain',
    'organization',
    null,
    v_now,
    'active',
    p_actor_id
  );
end;
$$;

revoke execute on function public.transfer_organization_captain(uuid, uuid) from public;
revoke execute on function public.transfer_organization_captain(uuid, uuid) from anon;
revoke execute on function public.transfer_organization_captain(uuid, uuid) from authenticated;
grant execute on function public.transfer_organization_captain(uuid, uuid) to service_role;
