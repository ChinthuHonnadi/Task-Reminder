create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  telegram_chat_id text,
  telegram_connected boolean not null default false,
  telegram_last_tested_at timestamptz,
  accent text not null default '#8FA3FF',
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  browser_notifications boolean not null default false,
  default_nag_interval integer not null default 30 check (default_nag_interval in (15, 30, 60)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#8FA3FF',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  notes text not null default '',
  category text not null default 'Others',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  tags text[] not null default '{}',
  due_date date,
  due_time time,
  estimated_duration integer not null default 30 check (estimated_duration > 0),
  links text[] not null default '{}',
  files jsonb not null default '[]'::jsonb,
  color_label text not null default '#8FA3FF',
  favorite boolean not null default false,
  archived boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,
  repeat_rule jsonb not null default '{"unit":"none","every":1,"customUnit":"days"}'::jsonb,
  reminders jsonb not null default '[]'::jsonb,
  nag_mode boolean not null default false,
  nag_interval integer not null default 30 check (nag_interval in (15, 30, 60)),
  source_recurring_id uuid references public.tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled note',
  content text not null default '',
  color text not null default '#8FA3FF',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes
  add column if not exists color text not null default '#8FA3FF';

alter table public.notes
  drop column if exists reminder_at,
  drop column if exists pinned,
  drop column if exists completed;

create table if not exists public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('telegram')),
  scheduled_for timestamptz not null,
  delivered_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  created_at timestamptz not null default now(),
  unique (task_id, user_id, channel, scheduled_for)
);

do $$
begin
  alter table public.reminder_deliveries
    alter column task_id set not null;
exception
  when others then null;
end $$;

alter table public.reminder_deliveries
  drop column if exists note_id;

do $$
begin
  alter table public.reminder_deliveries
    drop constraint reminder_deliveries_has_one_source;
exception
  when undefined_object then null;
end $$;

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date, completed, archived);
create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index if not exists reminder_deliveries_due_idx on public.reminder_deliveries (scheduled_for, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.tasks enable row level security;
alter table public.notes enable row level security;
alter table public.reminder_deliveries enable row level security;

drop policy if exists "Profiles are owned by users" on public.profiles;
create policy "Profiles are owned by users" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Categories are owned by users" on public.categories;
create policy "Categories are owned by users" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Tasks are owned by users" on public.tasks;
create policy "Tasks are owned by users" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Notes are owned by users" on public.notes;
create policy "Notes are owned by users" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Reminder deliveries are owned by users" on public.reminder_deliveries;
create policy "Reminder deliveries are owned by users" on public.reminder_deliveries
  for select using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table public.tasks;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notes;
exception
  when duplicate_object then null;
end $$;
