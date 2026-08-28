-- Arregla un bug real en handle_new_user() introducido por la migración 012
-- (Semana 11, invitaciones de equipo): rompe TODO signup normal (sin
-- invitation_token) -- es decir, prácticamente todos los signups reales,
-- no solo los invitados.
--
-- Causa: `v_invitation` se declaró como `record` sin tipo. El SELECT INTO
-- que lo llena solo se ejecuta DENTRO del `if v_invitation_token is not
-- null`. En un signup normal ese bloque se saltea entero, así que
-- `v_invitation` queda sin asignar en esta ejecución -- y la siguiente
-- línea (`if v_invitation.id is not null`) tira
-- "record 'v_invitation' is not assigned yet", que Supabase Auth reporta
-- como el genérico "Database error saving new user" (500) al hacer
-- `signUp()`. Confirmado en vivo: un signup con `invitation_token` (incluso
-- uno inexistente) funciona bien -- ahí el SELECT INTO sí se ejecuta,
-- aunque no encuentre filas, dejando el record asignado (todo NULL) en vez
-- de sin asignar.
--
-- Fix: reemplazar el `record` por 2 variables escalares (`uuid`), que en
-- PL/pgSQL arrancan en NULL por default sin necesidad de que ningún SELECT
-- las toque -- se puede preguntar `is not null` sobre ellas sin importar si
-- el SELECT INTO llegó a correr.
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
  v_invitation_id uuid;
  v_invitation_gym_id uuid;
begin
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_invitation_token := new.raw_user_meta_data ->> 'invitation_token';

  if v_invitation_token is not null then
    select id, gym_id into v_invitation_id, v_invitation_gym_id
    from public.team_invitations
    where token = v_invitation_token
      and status = 'pending'
      and expires_at > now()
    limit 1;
  end if;

  if v_invitation_id is not null then
    insert into public.users (id, gym_id, email, full_name, role)
    values (new.id, v_invitation_gym_id, new.email, v_full_name, 'staff');

    update public.team_invitations
    set status = 'accepted'
    where id = v_invitation_id;

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
