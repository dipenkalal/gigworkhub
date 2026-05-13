create table if not exists public.shift_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
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
  user_id uuid references auth.users(id) on delete cascade,
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
  user_id uuid references auth.users(id) on delete cascade,
  rider_name text not null,
  repair_date date not null,
  repair_type text not null,
  repair_cost numeric not null,
  notes text
);

create table if not exists public.income_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete cascade,
  rider_name text not null,
  income_date date not null,
  platform text not null,
  income_amount numeric not null,
  tips_amount numeric,
  notes text
);

create table if not exists public.rider_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rider_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shift_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.fuel_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.repair_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.income_entries add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.shift_entries enable row level security;
alter table public.fuel_entries enable row level security;
alter table public.repair_entries enable row level security;
alter table public.income_entries enable row level security;
alter table public.rider_profiles enable row level security;

drop policy if exists "Allow public shift inserts" on public.shift_entries;
drop policy if exists "Allow public shift reads" on public.shift_entries;
drop policy if exists "Allow public shift updates" on public.shift_entries;
drop policy if exists "Allow public fuel inserts" on public.fuel_entries;
drop policy if exists "Allow public fuel reads" on public.fuel_entries;
drop policy if exists "Allow public fuel updates" on public.fuel_entries;
drop policy if exists "Allow public repair inserts" on public.repair_entries;
drop policy if exists "Allow public repair reads" on public.repair_entries;
drop policy if exists "Allow public repair updates" on public.repair_entries;
drop policy if exists "Allow public income inserts" on public.income_entries;
drop policy if exists "Allow public income reads" on public.income_entries;
drop policy if exists "Allow public income updates" on public.income_entries;
drop policy if exists "Users can insert own shift entries" on public.shift_entries;
drop policy if exists "Users can read own shift entries" on public.shift_entries;
drop policy if exists "Users can update own shift entries" on public.shift_entries;
drop policy if exists "Users can insert own fuel entries" on public.fuel_entries;
drop policy if exists "Users can read own fuel entries" on public.fuel_entries;
drop policy if exists "Users can insert own repair entries" on public.repair_entries;
drop policy if exists "Users can read own repair entries" on public.repair_entries;
drop policy if exists "Users can insert own income entries" on public.income_entries;
drop policy if exists "Users can read own income entries" on public.income_entries;
drop policy if exists "Users can manage own rider profile" on public.rider_profiles;

create policy "Users can insert own shift entries"
on public.shift_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own shift entries"
on public.shift_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can update own shift entries"
on public.shift_entries
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can insert own fuel entries"
on public.fuel_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own fuel entries"
on public.fuel_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own repair entries"
on public.repair_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own repair entries"
on public.repair_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own income entries"
on public.income_entries
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can read own income entries"
on public.income_entries
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can manage own rider profile"
on public.rider_profiles
for all
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
