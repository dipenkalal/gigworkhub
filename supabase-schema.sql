create table if not exists public.shift_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  entry_type text not null check (entry_type in ('start_shift', 'end_shift')),
  rider_name text not null,
  shift_date date not null,
  platform text not null,
  start_km numeric,
  end_km numeric,
  notes text
);

create table if not exists public.fuel_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rider_name text not null,
  fuel_date date not null,
  odometer_km numeric,
  fuel_litres numeric,
  fuel_cost numeric not null,
  notes text
);

create table if not exists public.repair_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rider_name text not null,
  repair_date date not null,
  repair_type text not null,
  repair_cost numeric not null,
  notes text
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  rider_name text not null,
  income_date date not null,
  platform text not null,
  income_amount numeric not null,
  tips_amount numeric,
  notes text
);

alter table public.shift_entries enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.repair_entries enable row level security;
alter table public.income_entries enable row level security;

drop policy if exists "Allow public shift inserts" on public.shift_entries;
drop policy if exists "Allow public shift reads" on public.shift_entries;
drop policy if exists "Allow public shift updates" on public.shift_entries;
drop policy if exists "Allow public fuel inserts" on public.fuel_entries;
drop policy if exists "Allow public repair inserts" on public.repair_entries;
drop policy if exists "Allow public income inserts" on public.income_entries;

create policy "Allow public shift inserts"
on public.shift_entries
for insert
to anon
with check (true);

create policy "Allow public shift reads"
on public.shift_entries
for select
to anon
using (true);

create policy "Allow public shift updates"
on public.shift_entries
for update
to anon
using (true)
with check (true);

create policy "Allow public fuel inserts"
on public.fuel_entries
for insert
to anon
with check (true);

create policy "Allow public repair inserts"
on public.repair_entries
for insert
to anon
with check (true);

create policy "Allow public income inserts"
on public.income_entries
for insert
to anon
with check (true);
