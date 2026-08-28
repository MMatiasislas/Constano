-- Tabla de leads capturados en /comenzar, antes del signup real. Es data
-- interna del negocio de Constano (a quién le vendemos, no un gimnasio
-- cliente todavía) — NO tiene RLS activo a propósito: no hay concepto de
-- "gym_id" acá, y por ahora, sin panel de super-admin, se consulta directo
-- desde el Table Editor de Supabase con tu cuenta.
create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  gym_name text not null,
  email text not null,
  phone text,
  converted_gym_id uuid references gyms(id) on delete set null,
  converted_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_leads_email on leads(email);
create index if not exists idx_leads_created on leads(created_at desc);

-- Gotcha ya documentado en CLAUDE.md (Semana 10, con `subscription_plans`):
-- Supabase le activa RLS automáticamente a las tablas nuevas creadas desde
-- el SQL Editor, sin ninguna policy — eso deniega TODO en silencio para
-- selects (devuelve `[]` sin error) y con un 42501 explícito para inserts.
-- Esta línea es la que efectivamente deja la tabla abierta como se pensó.
alter table public.leads disable row level security;
