create or replace function public.replace_home_featured_posts(post_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.home_featured_posts;

  insert into public.home_featured_posts (post_id, display_order)
  select post_id, display_order - 1
  from unnest(post_ids) with ordinality as selected(post_id, display_order);
end;
$$;

revoke all on function public.replace_home_featured_posts(uuid[]) from public;
revoke all on function public.replace_home_featured_posts(uuid[]) from anon;
revoke all on function public.replace_home_featured_posts(uuid[]) from authenticated;
grant execute on function public.replace_home_featured_posts(uuid[]) to service_role;
