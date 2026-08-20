-- Reemplaza los inserts manuales del signup por un trigger en auth.users:
-- al crear un usuario en Supabase Auth, se crea automáticamente su gym
-- (en trial) y su fila en public.users con rol 'owner'.

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
begin
  v_gym_name := coalesce(new.raw_user_meta_data ->> 'gym_name', 'Mi gimnasio');
  v_full_name := coalesce(new.raw_user_meta_data ->> 'full_name', '');

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
