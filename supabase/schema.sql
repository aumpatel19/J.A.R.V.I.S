-- Run this in your Supabase SQL editor (project > SQL Editor > New query)

create table if not exists conversations (
  id          uuid primary key default gen_random_uuid(),
  user_text   text not null,
  jarvis_text text not null,
  intent      text,
  actions     jsonb default '[]'::jsonb,
  created_at  timestamptz default now()
);

create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  description text not null,
  status      text check (status in ('pending','running','done','failed')) default 'pending',
  result      jsonb,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists memory (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  value       jsonb not null,
  updated_at  timestamptz default now()
);

create index if not exists conversations_created_at_idx on conversations (created_at desc);
create index if not exists tasks_status_idx on tasks (status, created_at desc);

-- Auto-update updated_at on tasks
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tasks_updated_at on tasks;
create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

drop trigger if exists memory_updated_at on memory;
create trigger memory_updated_at
  before update on memory
  for each row execute function update_updated_at();
