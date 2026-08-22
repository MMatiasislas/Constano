alter table public.retention_alerts
  add column if not exists resolution_reason text,
  add column if not exists days_without_attendance integer;
