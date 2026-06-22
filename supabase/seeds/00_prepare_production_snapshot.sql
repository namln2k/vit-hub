-- Migrations install canonical authorization data before seeds run.
-- Remove that migration-owned data so the following production snapshot can
-- restore the exact production rows without primary-key conflicts.

delete from public.event_role_assignments;
delete from public.role_assignments;
delete from public.role_permission_grants;
delete from public.roles;
delete from public.permissions;
