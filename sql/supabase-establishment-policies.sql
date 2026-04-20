-- Políticas básicas para o painel do estabelecimento
-- Rode este arquivo no SQL Editor do Supabase caso o painel esteja logando,
-- lendo alguns dados, mas bloqueando criação/edição/exclusão por RLS.

alter table if exists public.establishments enable row level security;
alter table if exists public.establishment_users enable row level security;
alter table if exists public.products enable row level security;
alter table if exists public.categories enable row level security;
alter table if exists public.orders enable row level security;
alter table if exists public.support_tickets enable row level security;
alter table if exists public.support_ticket_messages enable row level security;
alter table if exists public.establishment_tables enable row level security;
alter table if exists public.inventory_movements enable row level security;

create or replace function public.current_user_establishment_ids()
returns setof uuid
language sql
stable
as $$
  select eu.establishment_id
  from public.establishment_users eu
  where eu.auth_user_id = auth.uid()
    and eu.active = true
$$;

-- vínculo do usuário
DROP POLICY IF EXISTS establishment_users_select_own ON public.establishment_users;
create policy establishment_users_select_own
on public.establishment_users
for select
using (auth_user_id = auth.uid());

-- dados da loja
DROP POLICY IF EXISTS establishments_select_own ON public.establishments;
create policy establishments_select_own
on public.establishments
for select
using (id in (select public.current_user_establishment_ids()));

DROP POLICY IF EXISTS establishments_update_own ON public.establishments;
create policy establishments_update_own
on public.establishments
for update
using (id in (select public.current_user_establishment_ids()))
with check (id in (select public.current_user_establishment_ids()));

-- helper macro via repeated policies
DROP POLICY IF EXISTS categories_all_own ON public.categories;
create policy categories_all_own
on public.categories
for all
using (establishment_id in (select public.current_user_establishment_ids()))
with check (establishment_id in (select public.current_user_establishment_ids()));

DROP POLICY IF EXISTS products_all_own ON public.products;
create policy products_all_own
on public.products
for all
using (establishment_id in (select public.current_user_establishment_ids()))
with check (establishment_id in (select public.current_user_establishment_ids()));

DROP POLICY IF EXISTS orders_all_own ON public.orders;
create policy orders_all_own
on public.orders
for all
using (establishment_id in (select public.current_user_establishment_ids()))
with check (establishment_id in (select public.current_user_establishment_ids()));

DROP POLICY IF EXISTS support_tickets_all_own ON public.support_tickets;
create policy support_tickets_all_own
on public.support_tickets
for all
using (establishment_id in (select public.current_user_establishment_ids()))
with check (establishment_id in (select public.current_user_establishment_ids()));

DROP POLICY IF EXISTS support_ticket_messages_all_own ON public.support_ticket_messages;
create policy support_ticket_messages_all_own
on public.support_ticket_messages
for all
using (
  exists (
    select 1
    from public.support_tickets st
    where st.id = ticket_id
      and st.establishment_id in (select public.current_user_establishment_ids())
  )
)
with check (
  exists (
    select 1
    from public.support_tickets st
    where st.id = ticket_id
      and st.establishment_id in (select public.current_user_establishment_ids())
  )
);

DROP POLICY IF EXISTS establishment_tables_all_own ON public.establishment_tables;
create policy establishment_tables_all_own
on public.establishment_tables
for all
using (establishment_id in (select public.current_user_establishment_ids()))
with check (establishment_id in (select public.current_user_establishment_ids()));

DROP POLICY IF EXISTS inventory_movements_all_own ON public.inventory_movements;
create policy inventory_movements_all_own
on public.inventory_movements
for all
using (establishment_id in (select public.current_user_establishment_ids()))
with check (establishment_id in (select public.current_user_establishment_ids()));
