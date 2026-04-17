create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.establishment_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique,
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  role text not null default 'owner',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_establishment_users_auth_user_id
  on public.establishment_users(auth_user_id);

create index if not exists idx_establishment_users_establishment_id
  on public.establishment_users(establishment_id);

drop trigger if exists trg_establishment_users_updated_at on public.establishment_users;
create trigger trg_establishment_users_updated_at
before update on public.establishment_users
for each row
execute function public.set_updated_at();

create table if not exists public.plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer,
  created_at timestamptz not null default now(),
  unique(plan_id, feature_key)
);

create index if not exists idx_plan_features_plan_id
  on public.plan_features(plan_id);

create table if not exists public.establishment_subscriptions (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  commission_percent_snapshot numeric(5,2),
  watermark_enabled_snapshot boolean,
  support_level_snapshot text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_establishment_subscriptions_establishment_id
  on public.establishment_subscriptions(establishment_id);

drop trigger if exists trg_establishment_subscriptions_updated_at on public.establishment_subscriptions;
create trigger trg_establishment_subscriptions_updated_at
before update on public.establishment_subscriptions
for each row
execute function public.set_updated_at();

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(establishment_id, name)
);

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row
execute function public.set_updated_at();

alter table public.products
  add column if not exists establishment_id uuid references public.establishments(id) on delete cascade,
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists description text,
  add column if not exists cost_price numeric(12,2) not null default 0,
  add column if not exists sale_price numeric(12,2),
  add column if not exists stock_quantity numeric(12,3) not null default 0,
  add column if not exists stock_min_quantity numeric(12,3) not null default 0,
  add column if not exists track_inventory boolean not null default true,
  add column if not exists active boolean not null default true,
  add column if not exists image_url text,
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  movement_type text not null,
  quantity numeric(12,3) not null,
  unit_cost numeric(12,2),
  total_cost numeric(12,2),
  notes text,
  reference_order_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.establishment_tables (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  table_number text not null,
  qr_code_value text,
  qr_code_url text,
  seats integer,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(establishment_id, table_number)
);

drop trigger if exists trg_establishment_tables_updated_at on public.establishment_tables;
create trigger trg_establishment_tables_updated_at
before update on public.establishment_tables
for each row
execute function public.set_updated_at();

create or replace view public.v_establishment_active_plan as
select
  es.id as subscription_id,
  es.establishment_id,
  es.plan_id,
  p.name as plan_name,
  p.name as plan_display_name,
  coalesce(es.commission_percent_snapshot, 0)::numeric(5,2) as commission_percent,
  coalesce(es.watermark_enabled_snapshot, true) as watermark_enabled,
  coalesce(es.support_level_snapshot, 'ticket') as support_level,
  es.status,
  es.started_at,
  es.expires_at
from public.establishment_subscriptions es
join public.plans p on p.id = es.plan_id
where es.status = 'active';

create or replace view public.v_establishment_features as
select
  es.establishment_id,
  p.name as plan_name,
  pf.feature_key,
  pf.enabled,
  pf.limit_value
from public.establishment_subscriptions es
join public.plans p on p.id = es.plan_id
join public.plan_features pf on pf.plan_id = p.id
where es.status = 'active';

insert into public.plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.feature_key, f.enabled, f.limit_value
from public.plans p
join (
  values
    ('Standard', 'digital_menu', true, null),
    ('Standard', 'delivery_orders', true, null),
    ('Standard', 'establishment_panel', true, null),
    ('Standard', 'full_dashboard', true, null),
    ('Standard', 'inventory_management', true, null),
    ('Standard', 'ticket_support', true, null),
    ('Standard', 'menu_qr_code', true, null),
    ('Standard', 'table_qr_code', false, null),
    ('Standard', 'table_ordering', false, null),
    ('Standard', 'profit_analysis', false, null),
    ('Standard', 'split_bill', false, null),
    ('Standard', 'group_orders', false, null),
    ('Standard', 'support_24h', false, null),
    ('Standard', 'custom_packaging', false, null),
    ('Standard', 'table_qr_stands', false, 0),
    ('Standard', 'dooki_watermark', true, null),

    ('Premium', 'digital_menu', true, null),
    ('Premium', 'delivery_orders', true, null),
    ('Premium', 'establishment_panel', true, null),
    ('Premium', 'full_dashboard', true, null),
    ('Premium', 'inventory_management', true, null),
    ('Premium', 'ticket_support', true, null),
    ('Premium', 'menu_qr_code', true, null),
    ('Premium', 'table_qr_code', true, null),
    ('Premium', 'table_ordering', true, null),
    ('Premium', 'profit_analysis', true, null),
    ('Premium', 'split_bill', false, null),
    ('Premium', 'group_orders', false, null),
    ('Premium', 'support_24h', false, null),
    ('Premium', 'custom_packaging', false, null),
    ('Premium', 'table_qr_stands', false, 0),
    ('Premium', 'dooki_watermark', true, null),

    ('Enterprise', 'digital_menu', true, null),
    ('Enterprise', 'delivery_orders', true, null),
    ('Enterprise', 'establishment_panel', true, null),
    ('Enterprise', 'full_dashboard', true, null),
    ('Enterprise', 'inventory_management', true, null),
    ('Enterprise', 'ticket_support', true, null),
    ('Enterprise', 'menu_qr_code', true, null),
    ('Enterprise', 'table_qr_code', true, null),
    ('Enterprise', 'table_ordering', true, null),
    ('Enterprise', 'profit_analysis', true, null),
    ('Enterprise', 'split_bill', true, null),
    ('Enterprise', 'group_orders', true, null),
    ('Enterprise', 'support_24h', true, null),
    ('Enterprise', 'custom_packaging', true, null),
    ('Enterprise', 'table_qr_stands', true, 30),
    ('Enterprise', 'dooki_watermark', false, null)
) as f(plan_name, feature_key, enabled, limit_value)
on p.name = f.plan_name
on conflict (plan_id, feature_key) do update
set
  enabled = excluded.enabled,
  limit_value = excluded.limit_value;