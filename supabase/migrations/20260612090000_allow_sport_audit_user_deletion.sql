alter table public.sport_game_cost_items
  alter column created_by drop not null,
  alter column updated_by drop not null;

alter table public.sport_game_payments
  alter column updated_by drop not null;

alter table public.sport_game_cost_items
  drop constraint if exists badminton_game_cost_items_created_by_fkey,
  add constraint badminton_game_cost_items_created_by_fkey
    foreign key (created_by)
    references public."user"(id)
    on delete set null;

alter table public.sport_game_cost_items
  drop constraint if exists badminton_game_cost_items_updated_by_fkey,
  add constraint badminton_game_cost_items_updated_by_fkey
    foreign key (updated_by)
    references public."user"(id)
    on delete set null;

alter table public.sport_game_payments
  drop constraint if exists badminton_game_payments_updated_by_fkey,
  add constraint badminton_game_payments_updated_by_fkey
    foreign key (updated_by)
    references public."user"(id)
    on delete set null;
