alter table public.users
  add column if not exists onboarding_seen_at timestamp with time zone;
