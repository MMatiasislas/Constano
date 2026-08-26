-- Nueva tabla de planes disponibles (catálogo fijo del sistema, no por gym)
create table if not exists public.subscription_plans (
  id text primary key, -- 'basic', 'pro', 'max'
  name text not null,
  price_ars numeric not null,
  max_members int, -- null = ilimitado
  features jsonb default '[]'::jsonb,
  active boolean default true
);

insert into public.subscription_plans (id, name, price_ars, max_members, features) values
  ('basic', 'Basic', 30000, 50, '["Gestión de alumnos", "Rutinas 1 a 1", "Asistencia con QR"]'),
  ('pro', 'Pro', 50000, 100, '["Todo lo de Basic", "Plantillas de rutinas", "PDF con tu logo", "Retención automática"]'),
  ('max', 'Max', 80000, 200, '["Todo lo de Pro", "Alumnos y staff ilimitados", "Soporte prioritario"]')
on conflict (id) do nothing;

-- Historial/registro de suscripciones del gym
create table if not exists public.gym_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  plan_id text not null references subscription_plans(id),
  provider text not null, -- 'mercadopago' | 'stripe'
  provider_subscription_id text, -- id de la suscripción en MP/Stripe
  status text not null default 'pending', -- 'pending' | 'active' | 'cancelled' | 'failed'
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  created_at timestamp with time zone default now()
);

create index if not exists idx_gym_subscriptions_gym on gym_subscriptions(gym_id);

alter table gym_subscriptions enable row level security;

create policy "gym_subscriptions_select_own" on gym_subscriptions
  for select to authenticated
  using (gym_id = current_gym_id());

-- Solo el sistema (via webhooks con service role) puede insertar/actualizar, no el cliente
-- No agregamos policy de insert/update para authenticated a propósito.

-- Ajustar gyms.subscription_status para incluir los nuevos estados
-- (ya es varchar libre, no hace falta ALTER, solo documentamos los valores válidos:
-- 'trial' | 'grace_period' | 'active' | 'suspended')

alter table gyms add column if not exists grace_period_ends_at timestamp with time zone;
alter table gyms add column if not exists current_plan_id text references subscription_plans(id);
