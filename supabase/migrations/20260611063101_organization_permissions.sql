create extension if not exists pgcrypto;
create extension if not exists btree_gist with schema extensions;

alter table public."user"
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_status_check'
  ) then
    alter table public."user"
      add constraint user_status_check check (status in ('active', 'disabled'));
  end if;
end $$;

alter table public.divisions
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public."user"(id),
  add column if not exists updated_at timestamptz not null default now();

alter table public.groups
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public."user"(id),
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.roles (
  key text primary key,
  scope_type text not null check (scope_type in ('organization', 'division', 'group', 'club', 'event')),
  label text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  key text primary key,
  label text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.role_permission_grants (
  role_key text not null references public.roles(key) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  effect_scope text not null check (effect_scope in ('self_scope', 'child_club', 'organization', 'owned_event')),
  is_enabled boolean not null default true,
  updated_by uuid references public."user"(id),
  updated_at timestamptz not null default now(),
  primary key (role_key, permission_key, effect_scope)
);

create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id),
  name text not null,
  description text,
  archived_at timestamptz,
  archived_by uuid references public."user"(id),
  created_by uuid references public."user"(id),
  updated_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clubs_name_in_division_unique unique (division_id, name)
);

create table if not exists public.division_memberships (
  id uuid primary key default gen_random_uuid(),
  division_id uuid not null references public.divisions(id),
  user_id uuid not null references public."user"(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended', 'revoked')),
  source text not null default 'manual' check (source in ('manual', 'role_assignment_auto')),
  added_by uuid references public."user"(id),
  ended_by uuid references public."user"(id),
  revoked_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint division_memberships_time_check check (ends_at is null or starts_at < ends_at)
);

create table if not exists public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id),
  user_id uuid not null references public."user"(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended', 'revoked')),
  source text not null default 'manual' check (source in ('manual', 'role_assignment_auto')),
  added_by uuid references public."user"(id),
  ended_by uuid references public."user"(id),
  revoked_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint group_memberships_time_check check (ends_at is null or starts_at < ends_at)
);

create table if not exists public.club_memberships (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id),
  user_id uuid not null references public."user"(id),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended', 'revoked')),
  source text not null default 'manual' check (source in ('manual', 'role_assignment_auto')),
  added_by uuid references public."user"(id),
  ended_by uuid references public."user"(id),
  revoked_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint club_memberships_time_check check (ends_at is null or starts_at < ends_at)
);

create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public."user"(id),
  role_key text not null references public.roles(key),
  scope_type text not null check (scope_type in ('organization', 'division', 'group', 'club')),
  scope_id text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  status text not null default 'active' check (status in ('active', 'ended', 'revoked')),
  assigned_by uuid references public."user"(id),
  ended_by uuid references public."user"(id),
  revoked_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint role_assignments_scope_id_check check (
    (scope_type = 'organization' and scope_id is null)
    or (scope_type <> 'organization' and scope_id is not null)
  ),
  constraint role_assignments_time_check check (ends_at is null or starts_at < ends_at),
  constraint role_assignments_role_scope_check check (
    (role_key in ('captain', 'vice_captain') and scope_type = 'organization')
    or (role_key in ('division_lead', 'division_deputy') and scope_type = 'division')
    or (role_key in ('group_lead', 'group_deputy') and scope_type = 'group')
    or (role_key in ('club_lead', 'club_deputy') and scope_type = 'club')
  )
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_scope_type text not null check (owner_scope_type in ('organization', 'division', 'group', 'club')),
  owner_scope_id text,
  visibility text not null check (visibility in ('organization', 'scope', 'managers')),
  show_participants_publicly boolean not null default true,
  starts_at timestamptz not null,
  ends_at timestamptz,
  public_location text,
  public_description text,
  internal_notes text,
  created_by uuid not null references public."user"(id),
  updated_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_owner_scope_check check (
    (owner_scope_type = 'organization' and owner_scope_id is null)
    or (owner_scope_type <> 'organization' and owner_scope_id is not null)
  ),
  constraint events_time_check check (ends_at is null or starts_at < ends_at)
);

create table if not exists public.event_memberships (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public."user"(id),
  status text not null default 'going' check (status in ('going', 'checked_in', 'absent')),
  joined_at timestamptz not null default now(),
  added_by uuid references public."user"(id),
  unique (event_id, user_id)
);

create table if not exists public.event_role_assignments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public."user"(id),
  role_key text not null references public.roles(key),
  assigned_by uuid references public."user"(id),
  created_at timestamptz not null default now(),
  constraint event_role_assignments_role_check check (
    role_key in ('event_lead', 'event_deputy', 'event_staff_lead', 'event_volunteer')
  )
);

create unique index if not exists event_role_assignments_one_lead_per_event
  on public.event_role_assignments (event_id)
  where role_key = 'event_lead';

create unique index if not exists event_role_assignments_unique_role_user
  on public.event_role_assignments (event_id, user_id, role_key);

create index if not exists clubs_division_id_idx on public.clubs (division_id);
create index if not exists division_memberships_user_id_idx on public.division_memberships (user_id);
create index if not exists division_memberships_division_id_idx on public.division_memberships (division_id);
create index if not exists group_memberships_user_id_idx on public.group_memberships (user_id);
create index if not exists group_memberships_group_id_idx on public.group_memberships (group_id);
create index if not exists club_memberships_user_id_idx on public.club_memberships (user_id);
create index if not exists club_memberships_club_id_idx on public.club_memberships (club_id);
create index if not exists role_assignments_user_id_idx on public.role_assignments (user_id);
create index if not exists role_assignments_scope_idx on public.role_assignments (scope_type, scope_id);
create index if not exists events_owner_scope_idx on public.events (owner_scope_type, owner_scope_id);
create index if not exists event_memberships_user_id_idx on public.event_memberships (user_id);
create index if not exists event_role_assignments_user_id_idx on public.event_role_assignments (user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'division_memberships_no_active_overlap'
  ) then
    alter table public.division_memberships
      add constraint division_memberships_no_active_overlap
      exclude using gist (
        division_id with =,
        user_id with =,
        tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
      )
      where (status = 'active');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'group_memberships_no_active_overlap'
  ) then
    alter table public.group_memberships
      add constraint group_memberships_no_active_overlap
      exclude using gist (
        group_id with =,
        user_id with =,
        tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
      )
      where (status = 'active');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'club_memberships_no_active_overlap'
  ) then
    alter table public.club_memberships
      add constraint club_memberships_no_active_overlap
      exclude using gist (
        club_id with =,
        user_id with =,
        tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
      )
      where (status = 'active');
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'role_assignments_one_lead_per_scope_interval'
  ) then
    alter table public.role_assignments
      add constraint role_assignments_one_lead_per_scope_interval
      exclude using gist (
        scope_type with =,
        coalesce(scope_id, 'organization') with =,
        role_key with =,
        tstzrange(starts_at, coalesce(ends_at, 'infinity'::timestamptz), '[)') with &&
      )
      where (
        status = 'active'
        and role_key in ('division_lead', 'group_lead', 'club_lead')
      );
  end if;
end $$;

insert into public.roles (key, scope_type, label)
values
  ('captain', 'organization', 'Đội trưởng'),
  ('vice_captain', 'organization', 'Đội phó'),
  ('division_lead', 'division', 'Mảng trưởng'),
  ('division_deputy', 'division', 'Mảng phó'),
  ('group_lead', 'group', 'Nhóm trưởng'),
  ('group_deputy', 'group', 'Nhóm phó'),
  ('club_lead', 'club', 'Chủ nhiệm CLB/tổ trưởng'),
  ('club_deputy', 'club', 'Phó chủ nhiệm CLB/tổ phó'),
  ('event_lead', 'event', 'Phụ trách event'),
  ('event_deputy', 'event', 'Phó phụ trách event'),
  ('event_staff_lead', 'event', 'Trưởng staff event'),
  ('event_volunteer', 'event', 'Tình nguyện viên event')
on conflict (key) do update set
  scope_type = excluded.scope_type,
  label = excluded.label;

insert into public.permissions (key, label, description)
values
  ('scope.member.view_contact', 'Xem liên hệ thành viên scope', 'Xem email và số điện thoại của thành viên trong scope được phép.'),
  ('scope.member.manage', 'Quản lý thành viên scope', 'Thêm hoặc kết thúc membership trong scope được phép.'),
  ('scope.role.assign_deputy', 'Bổ nhiệm cấp phó', 'Bổ nhiệm cấp phó trong scope được phép.'),
  ('scope.role.assign_lead', 'Bổ nhiệm trưởng chính', 'Bổ nhiệm hoặc transfer trưởng chính trong scope được phép.'),
  ('scope.role.revoke_deputy', 'Gỡ cấp phó', 'Kết thúc hoặc revoke cấp phó trong scope được phép.'),
  ('scope.role.revoke_lead', 'Gỡ trưởng chính', 'Kết thúc hoặc revoke trưởng chính trong scope được phép.'),
  ('event.create', 'Tạo event', 'Tạo event chính thức trong owner scope được phép.'),
  ('event.view_private', 'Xem dữ liệu riêng tư event', 'Xem dữ liệu vận hành riêng tư của event.'),
  ('event.manage', 'Quản lý event', 'Cập nhật metadata và cấu hình event.'),
  ('event.member.manage', 'Quản lý thành viên event', 'Thêm hoặc cập nhật thành viên event.'),
  ('event.role.assign', 'Bổ nhiệm role event', 'Bổ nhiệm role trong event.'),
  ('event.role.revoke', 'Gỡ role event', 'Gỡ role trong event.'),
  ('event.attendance.update', 'Cập nhật attendance event', 'Cập nhật trạng thái attendance của event members.'),
  ('permission.view', 'Xem permission matrix', 'Xem role permission grants.'),
  ('permission.manage', 'Quản lý permission matrix', 'Cập nhật role permission grants.')
on conflict (key) do update set
  label = excluded.label,
  description = excluded.description;

insert into public.role_permission_grants (role_key, permission_key, effect_scope, is_enabled)
select role_key, permission_key, effect_scope, true
from (
  values
    ('captain', 'scope.member.view_contact', 'organization'),
    ('captain', 'scope.member.manage', 'organization'),
    ('captain', 'scope.role.assign_deputy', 'organization'),
    ('captain', 'scope.role.assign_lead', 'organization'),
    ('captain', 'scope.role.revoke_deputy', 'organization'),
    ('captain', 'scope.role.revoke_lead', 'organization'),
    ('captain', 'event.create', 'organization'),
    ('captain', 'event.view_private', 'organization'),
    ('captain', 'event.manage', 'organization'),
    ('captain', 'event.member.manage', 'organization'),
    ('captain', 'event.role.assign', 'organization'),
    ('captain', 'event.role.revoke', 'organization'),
    ('captain', 'event.attendance.update', 'organization'),
    ('captain', 'permission.view', 'organization'),
    ('captain', 'permission.manage', 'organization'),
    ('vice_captain', 'scope.member.view_contact', 'organization'),
    ('vice_captain', 'scope.member.manage', 'organization'),
    ('vice_captain', 'scope.role.assign_deputy', 'organization'),
    ('vice_captain', 'scope.role.assign_lead', 'organization'),
    ('vice_captain', 'scope.role.revoke_deputy', 'organization'),
    ('vice_captain', 'scope.role.revoke_lead', 'organization'),
    ('vice_captain', 'event.create', 'organization'),
    ('vice_captain', 'event.view_private', 'organization'),
    ('vice_captain', 'event.manage', 'organization'),
    ('vice_captain', 'event.member.manage', 'organization'),
    ('vice_captain', 'event.role.assign', 'organization'),
    ('vice_captain', 'event.role.revoke', 'organization'),
    ('vice_captain', 'event.attendance.update', 'organization'),
    ('vice_captain', 'permission.view', 'organization'),
    ('vice_captain', 'permission.manage', 'organization'),
    ('division_lead', 'scope.member.view_contact', 'self_scope'),
    ('division_lead', 'scope.member.manage', 'self_scope'),
    ('division_lead', 'scope.role.assign_deputy', 'self_scope'),
    ('division_lead', 'scope.role.revoke_deputy', 'self_scope'),
    ('division_lead', 'event.create', 'self_scope'),
    ('division_lead', 'event.create', 'child_club'),
    ('division_lead', 'event.create', 'organization'),
    ('division_lead', 'event.view_private', 'self_scope'),
    ('division_lead', 'event.manage', 'self_scope'),
    ('division_lead', 'event.member.manage', 'self_scope'),
    ('division_lead', 'event.role.assign', 'self_scope'),
    ('division_lead', 'event.role.revoke', 'self_scope'),
    ('division_lead', 'event.attendance.update', 'self_scope'),
    ('division_deputy', 'scope.member.view_contact', 'self_scope'),
    ('division_deputy', 'scope.member.manage', 'self_scope'),
    ('division_deputy', 'event.create', 'self_scope'),
    ('division_deputy', 'event.create', 'child_club'),
    ('division_deputy', 'event.create', 'organization'),
    ('division_deputy', 'event.view_private', 'self_scope'),
    ('division_deputy', 'event.manage', 'self_scope'),
    ('division_deputy', 'event.member.manage', 'self_scope'),
    ('division_deputy', 'event.role.assign', 'self_scope'),
    ('division_deputy', 'event.role.revoke', 'self_scope'),
    ('division_deputy', 'event.attendance.update', 'self_scope'),
    ('group_lead', 'scope.member.view_contact', 'self_scope'),
    ('group_lead', 'scope.member.manage', 'self_scope'),
    ('group_lead', 'scope.role.assign_deputy', 'self_scope'),
    ('group_lead', 'scope.role.revoke_deputy', 'self_scope'),
    ('group_lead', 'event.create', 'self_scope'),
    ('group_lead', 'event.view_private', 'self_scope'),
    ('group_lead', 'event.manage', 'self_scope'),
    ('group_lead', 'event.member.manage', 'self_scope'),
    ('group_lead', 'event.role.assign', 'self_scope'),
    ('group_lead', 'event.role.revoke', 'self_scope'),
    ('group_lead', 'event.attendance.update', 'self_scope'),
    ('group_deputy', 'scope.member.view_contact', 'self_scope'),
    ('group_deputy', 'scope.member.manage', 'self_scope'),
    ('group_deputy', 'event.create', 'self_scope'),
    ('group_deputy', 'event.view_private', 'self_scope'),
    ('group_deputy', 'event.manage', 'self_scope'),
    ('group_deputy', 'event.member.manage', 'self_scope'),
    ('group_deputy', 'event.role.assign', 'self_scope'),
    ('group_deputy', 'event.role.revoke', 'self_scope'),
    ('group_deputy', 'event.attendance.update', 'self_scope'),
    ('club_lead', 'scope.member.view_contact', 'self_scope'),
    ('club_lead', 'scope.member.manage', 'self_scope'),
    ('club_lead', 'scope.role.assign_deputy', 'self_scope'),
    ('club_lead', 'scope.role.revoke_deputy', 'self_scope'),
    ('club_lead', 'event.create', 'self_scope'),
    ('club_lead', 'event.view_private', 'self_scope'),
    ('club_lead', 'event.manage', 'self_scope'),
    ('club_lead', 'event.member.manage', 'self_scope'),
    ('club_lead', 'event.role.assign', 'self_scope'),
    ('club_lead', 'event.role.revoke', 'self_scope'),
    ('club_lead', 'event.attendance.update', 'self_scope'),
    ('club_deputy', 'scope.member.view_contact', 'self_scope'),
    ('club_deputy', 'scope.member.manage', 'self_scope'),
    ('club_deputy', 'event.create', 'self_scope'),
    ('club_deputy', 'event.view_private', 'self_scope'),
    ('club_deputy', 'event.manage', 'self_scope'),
    ('club_deputy', 'event.member.manage', 'self_scope'),
    ('club_deputy', 'event.role.assign', 'self_scope'),
    ('club_deputy', 'event.role.revoke', 'self_scope'),
    ('club_deputy', 'event.attendance.update', 'self_scope'),
    ('event_lead', 'event.view_private', 'owned_event'),
    ('event_lead', 'event.manage', 'owned_event'),
    ('event_lead', 'event.member.manage', 'owned_event'),
    ('event_lead', 'event.role.assign', 'owned_event'),
    ('event_lead', 'event.role.revoke', 'owned_event'),
    ('event_lead', 'event.attendance.update', 'owned_event'),
    ('event_deputy', 'event.view_private', 'owned_event'),
    ('event_deputy', 'event.manage', 'owned_event'),
    ('event_deputy', 'event.member.manage', 'owned_event'),
    ('event_deputy', 'event.role.assign', 'owned_event'),
    ('event_deputy', 'event.role.revoke', 'owned_event'),
    ('event_deputy', 'event.attendance.update', 'owned_event'),
    ('event_staff_lead', 'event.view_private', 'owned_event'),
    ('event_staff_lead', 'event.attendance.update', 'owned_event'),
    ('event_volunteer', 'event.view_private', 'owned_event')
) as grants(role_key, permission_key, effect_scope)
on conflict (role_key, permission_key, effect_scope) do nothing;

do $$
begin
  if to_regclass('public.user_divisions') is not null then
    insert into public.division_memberships (division_id, user_id, starts_at, status, source)
    select user_divisions.division_id, user_divisions.user_id, now(), 'active', 'manual'
    from public.user_divisions
    where not exists (
      select 1
      from public.division_memberships
      where division_memberships.division_id = user_divisions.division_id
        and division_memberships.user_id = user_divisions.user_id
        and division_memberships.status = 'active'
        and division_memberships.starts_at <= now()
        and (division_memberships.ends_at is null or now() < division_memberships.ends_at)
    );
  end if;

  if to_regclass('public.user_groups') is not null then
    insert into public.group_memberships (group_id, user_id, starts_at, status, source)
    select user_groups.group_id, user_groups.user_id, now(), 'active', 'manual'
    from public.user_groups
    where not exists (
      select 1
      from public.group_memberships
      where group_memberships.group_id = user_groups.group_id
        and group_memberships.user_id = user_groups.user_id
        and group_memberships.status = 'active'
        and group_memberships.starts_at <= now()
        and (group_memberships.ends_at is null or now() < group_memberships.ends_at)
    );
  end if;
end $$;

alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permission_grants enable row level security;
alter table public.clubs enable row level security;
alter table public.division_memberships enable row level security;
alter table public.group_memberships enable row level security;
alter table public.club_memberships enable row level security;
alter table public.role_assignments enable row level security;
alter table public.events enable row level security;
alter table public.event_memberships enable row level security;
alter table public.event_role_assignments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'roles' and policyname = 'roles_read_authenticated') then
    execute 'create policy roles_read_authenticated on public.roles for select to authenticated using (true)';
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'permissions' and policyname = 'permissions_read_authenticated') then
    execute 'create policy permissions_read_authenticated on public.permissions for select to authenticated using (true)';
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'role_permission_grants' and policyname = 'role_permission_grants_read_authenticated') then
    execute 'create policy role_permission_grants_read_authenticated on public.role_permission_grants for select to authenticated using (true)';
  end if;
end $$;

grant select on public.roles to authenticated;
grant select on public.permissions to authenticated;
grant select on public.role_permission_grants to authenticated;
grant select, insert, update, delete on public.clubs to authenticated;
grant select, insert, update on public.division_memberships to authenticated;
grant select, insert, update on public.group_memberships to authenticated;
grant select, insert, update on public.club_memberships to authenticated;
grant select, insert, update on public.role_assignments to authenticated;
grant select, insert, update, delete on public.events to authenticated;
grant select, insert, update, delete on public.event_memberships to authenticated;
grant select, insert, update, delete on public.event_role_assignments to authenticated;
