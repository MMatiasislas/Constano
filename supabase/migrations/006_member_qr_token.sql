alter table public.members
  add column if not exists qr_token varchar unique;

create index if not exists idx_members_qr_token on members(qr_token) where qr_token is not null;
