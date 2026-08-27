create table if not exists public.team_invitations (
  id uuid primary key default uuid_generate_v4(),
  gym_id uuid not null references gyms(id) on delete cascade,
  email text not null,
  token text not null unique,
  invited_by uuid references users(id) on delete set null,
  status text not null default 'pending', -- 'pending' | 'accepted' | 'expired'
  expires_at timestamp with time zone not null default (now() + interval '7 days'),
  created_at timestamp with time zone default now()
);

create index if not exists idx_team_invitations_token on team_invitations(token);
create index if not exists idx_team_invitations_gym on team_invitations(gym_id);

alter table team_invitations enable row level security;

-- El owner del gym puede ver y crear invitaciones de su propio gym
drop policy if exists "team_invitations_owner_manage" on team_invitations;
create policy "team_invitations_owner_manage" on team_invitations
  for all to authenticated
  using (
    gym_id = current_gym_id()
    and exists (select 1 from users where id = auth.uid() and role = 'owner')
  )
  with check (
    gym_id = current_gym_id()
    and exists (select 1 from users where id = auth.uid() and role = 'owner')
  );

-- La pantalla pública de aceptar invitación (app/invitacion/[token]/page.tsx)
-- no tiene sesión iniciada, así que no puede leer esta tabla via RLS — usa
-- el cliente con service_role (lib/supabase/service-role.ts), que se salta
-- RLS. No hace falta ninguna policy extra para 'anon' acá.


-- Ajuste al trigger de signup (supabase/migrations/002_signup_trigger.sql):
-- si el signup viene con un `invitation_token` válido en los metadata del
-- usuario, en vez de crear un gym nuevo (comportamiento normal, deja al
-- usuario como 'owner'), se une como 'staff' al gym de la invitación y la
-- marca 'accepted'. Si el token no está o no es válido (vencido, ya usada,
-- inexistente), sigue el flujo normal de siempre sin romper nada.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gym_name text;
  v_full_name text;
  v_base_slug text;
  v_slug text;
  v_gym_id uuid;
  v_invitation_token text;
  v_invitation record;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_invitation_token := new.raw_user_meta_data ->> 'invitation_token';

  if v_invitation_token is not null then
    select * into v_invitation
    from public.team_invitations
    where token = v_invitation_token
      and status = 'pending'
      and expires_at > now()
    limit 1;
  end if;

  if v_invitation.id is not null then
    insert into public.users (id, gym_id, email, full_name, role)
    values (new.id, v_invitation.gym_id, new.email, v_full_name, 'staff');

    update public.team_invitations
    set status = 'accepted'
    where id = v_invitation.id;

    return new;
  end if;

  v_gym_name := coalesce(new.raw_user_meta_data ->> 'gym_name', 'Mi gimnasio');

  v_base_slug := trim(both '-' from regexp_replace(lower(trim(v_gym_name)), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'gimnasio';
  end if;
  v_slug := v_base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);

  insert into public.gyms (name, slug, timezone, trial_ends_at, subscription_status)
  values (v_gym_name, v_slug, 'America/Argentina/Buenos_Aires', now() + interval '14 days', 'trial')
  returning id into v_gym_id;

  insert into public.users (id, gym_id, email, full_name, role)
  values (new.id, v_gym_id, new.email, v_full_name, 'owner');

  return new;
end;
$$;
