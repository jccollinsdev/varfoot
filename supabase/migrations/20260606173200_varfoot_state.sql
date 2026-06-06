create table if not exists public.varfoot_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.varfoot_app_states (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.varfoot_profiles enable row level security;
alter table public.varfoot_app_states enable row level security;

create policy "Users can read their own profile"
  on public.varfoot_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profile"
  on public.varfoot_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.varfoot_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own profile"
  on public.varfoot_profiles
  for delete
  using (auth.uid() = user_id);

create policy "Users can read their own app state"
  on public.varfoot_app_states
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own app state"
  on public.varfoot_app_states
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own app state"
  on public.varfoot_app_states
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own app state"
  on public.varfoot_app_states
  for delete
  using (auth.uid() = user_id);

create or replace function public.set_varfoot_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_varfoot_profiles_updated_at on public.varfoot_profiles;
create trigger set_varfoot_profiles_updated_at
before update on public.varfoot_profiles
for each row
execute function public.set_varfoot_updated_at();

drop trigger if exists set_varfoot_app_states_updated_at on public.varfoot_app_states;
create trigger set_varfoot_app_states_updated_at
before update on public.varfoot_app_states
for each row
execute function public.set_varfoot_updated_at();
