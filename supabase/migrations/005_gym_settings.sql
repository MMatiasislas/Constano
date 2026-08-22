alter table public.gyms
  add column if not exists settings jsonb not null default '{}'::jsonb;
