-- Estrutura sugerida para futura integração com Supabase/Postgres.
-- Mantém o layout atual intacto e troca apenas a origem dos dados.

create extension if not exists pgcrypto;

create table if not exists public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  entry_date date not null,
  initial_balance numeric(12,2) not null default 0,
  final_balance numeric(12,2) not null default 0,
  result numeric(12,2) not null default 0,
  percentage numeric(8,2) not null default 0,
  daily_goal numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_entries_user_date_unique unique (user_id, entry_date)
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric(12,2) not null,
  withdrawal_date timestamptz not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark' check (theme in ('light', 'dark')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists daily_entries_user_date_idx on public.daily_entries (user_id, entry_date desc);
create index if not exists withdrawals_user_date_idx on public.withdrawals (user_id, withdrawal_date desc);

alter table public.daily_entries enable row level security;
alter table public.withdrawals enable row level security;
alter table public.user_preferences enable row level security;

create policy if not exists "Users can read own daily entries"
  on public.daily_entries for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own daily entries"
  on public.daily_entries for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own daily entries"
  on public.daily_entries for update using (auth.uid() = user_id);
create policy if not exists "Users can delete own daily entries"
  on public.daily_entries for delete using (auth.uid() = user_id);

create policy if not exists "Users can read own withdrawals"
  on public.withdrawals for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own withdrawals"
  on public.withdrawals for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own withdrawals"
  on public.withdrawals for update using (auth.uid() = user_id);
create policy if not exists "Users can delete own withdrawals"
  on public.withdrawals for delete using (auth.uid() = user_id);

create policy if not exists "Users can read own preferences"
  on public.user_preferences for select using (auth.uid() = user_id);
create policy if not exists "Users can insert own preferences"
  on public.user_preferences for insert with check (auth.uid() = user_id);
create policy if not exists "Users can update own preferences"
  on public.user_preferences for update using (auth.uid() = user_id);
