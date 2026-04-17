create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric not null default 0,
  discount numeric not null default 0,
  annual_price numeric not null default 0,
  annual_discount numeric not null default 0,
  trial_days integer not null default 0,
  description text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.establishments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  city text default '',
  segment text default '',
  plan_id uuid references public.plans(id),
  plan_name text default '',
  status text default 'Ativo',
  orders_today integer default 0,
  email text default '',
  description text default '',
  health text default 'Saudavel',
  tables_count integer default 0,
  qrcodes_count integer default 0,
  average_ticket numeric default 0,
  trial_plan_id uuid references public.plans(id),
  trial_plan_name text default '',
  trial_days integer default 0,
  trial_starts_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  name text not null,
  category text default 'Categoria',
  description text default '',
  price numeric not null default 0,
  image_url text default '',
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  code text not null,
  channel text not null default 'delivery',
  status text not null default 'aguardando',
  table_number integer,
  notes text default '',
  total numeric not null default 0,
  items_summary text default '',
  customer_name text default '',
  customer_address text default '',
  courier_status text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid references public.establishments(id) on delete set null,
  store_name text default '',
  subject text not null,
  priority text not null default 'Media',
  status text not null default 'aberto',
  created_at timestamptz not null default now()
);
