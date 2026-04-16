alter table public.establishments
add column if not exists establishment_code text unique;

alter table public.establishments
add column if not exists banner_url text;

update public.establishments
set establishment_code = coalesce(
  establishment_code,
  'EST-' || upper(substr(replace(id::text, '-', ''), 1, 8))
)
where establishment_code is null;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  establishment_id uuid not null references public.establishments(id) on delete cascade,
  direction text not null check (direction in ('charge', 'payout')),
  category text,
  amount numeric(12,2) not null default 0,
  status text not null default 'pending' check (status in ('pending', 'scheduled', 'paid', 'cancelled')),
  due_date date,
  pix_key text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_establishment_id_idx on public.payments(establishment_id);
create index if not exists payments_status_idx on public.payments(status);
create index if not exists payments_due_date_idx on public.payments(due_date);
