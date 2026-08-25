-- Semana 8, Bloque B — Check-in por QR.
--
-- Las páginas de /checkin/{gymSlug}/... son públicas (sin login de alumno
-- ni de staff), así que corren con el rol `anon` de Supabase. Las policies
-- de RLS existentes son todas `to authenticated` (ver 001_enable_rls.sql),
-- así que un cliente anon NO puede leer ni escribir nada en gyms/members/
-- attendances directamente — ni siquiera un simple `select name from gyms`.
--
-- Las 4 funciones de acá son la ÚNICA puerta de entrada pública a esos
-- datos, cada una devolviendo el mínimo indispensable para su propósito
-- (nunca la fila completa, nunca `settings` crudo con el PIN adentro).
-- Todas son SECURITY DEFINER (corren con los privilegios de quien las creó,
-- no del rol que las llama, así pueden leer/escribir salteando RLS) con
-- `search_path` fijado a `public` (mismo patrón que `current_gym_id()` en
-- 001_enable_rls.sql, evita el ataque clásico de shadowing de esquema sobre
-- funciones SECURITY DEFINER) y con el GRANT de ejecución explícito a
-- `anon`/`authenticated` después de revocarlo de `public` (por default
-- Postgres deja las funciones nuevas ejecutables por `public`).

-- 1) Nombre del gym para el header de las páginas públicas (kiosco, mi-qr,
--    scan) + si ya tiene un PIN de kiosco configurado (`has_kiosk_pin`,
--    booleano). Nunca devuelve `settings` crudo ni el valor del PIN.
create or replace function public.get_gym_public_info(p_gym_slug text)
returns table (id uuid, name text, has_kiosk_pin boolean)
language sql
security definer
stable
set search_path = public
as $$
  select g.id, g.name, (g.settings->>'kiosk_pin') is not null
  from public.gyms g
  where g.slug = p_gym_slug;
$$;

revoke all on function public.get_gym_public_info(text) from public;
grant execute on function public.get_gym_public_info(text) to anon;
grant execute on function public.get_gym_public_info(text) to authenticated;


-- 2) Nombre del alumno para la página "Mi QR" — valida que el token
--    pertenezca al gym del slug antes de devolver nada. No devuelve
--    teléfono, email, notas ni ningún otro dato del alumno.
create or replace function public.get_member_qr_info(p_gym_slug text, p_token text)
returns table (first_name text, last_name text)
language sql
security definer
stable
set search_path = public
as $$
  select m.first_name, m.last_name
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
    and g.slug = p_gym_slug;
$$;

revoke all on function public.get_member_qr_info(text, text) from public;
grant execute on function public.get_member_qr_info(text, text) to anon;
grant execute on function public.get_member_qr_info(text, text) to authenticated;


-- 3) Verifica el PIN de 4 dígitos para salir del modo kiosco. Devuelve
--    solo un boolean — el PIN real nunca sale de la función. Sin rate
--    limiting: el espacio de 10.000 combinaciones no está protegido acá a
--    propósito (ver nota de threat model en CLAUDE.md) — acertar el PIN
--    solo permite salir de la pantalla de escaneo en ESE dispositivo, no
--    da acceso a nada que no requiera además un login real de staff.
create or replace function public.verify_kiosk_pin(p_gym_slug text, p_pin text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.gyms g
    where g.slug = p_gym_slug
      and g.settings->>'kiosk_pin' = p_pin
  );
$$;

revoke all on function public.verify_kiosk_pin(text, text) from public;
grant execute on function public.verify_kiosk_pin(text, text) to anon;
grant execute on function public.verify_kiosk_pin(text, text) to authenticated;


-- 4) El check-in en sí. Busca el member por qr_token + gym_slug (una sola
--    condición combinada, para no filtrar si el token existe en OTRO gym),
--    exige que esté activo, e intenta insertar la asistencia. El índice
--    único de attendances (un registro por alumno por día) hace el trabajo
--    de "ya se marcó hoy" — acá solo se captura la excepción y se informa
--    la hora ya registrada en vez de fallar. Al ser SECURITY DEFINER no
--    hace falta auth.uid(): el insert no depende de RLS de usuario.
create or replace function public.checkin_by_qr_token(p_gym_slug text, p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
  v_gym_id uuid;
  v_first_name text;
  v_last_name text;
  v_status text;
  v_checked_in_at timestamptz;
begin
  select m.id, m.gym_id, m.first_name, m.last_name, m.status
  into v_member_id, v_gym_id, v_first_name, v_last_name, v_status
  from public.members m
  join public.gyms g on g.id = m.gym_id
  where m.qr_token = p_token
    and g.slug = p_gym_slug;

  if v_member_id is null then
    return jsonb_build_object('status', 'invalid');
  end if;

  -- Un alumno pausado/dado de baja no puede seguir marcando entrada con un
  -- QR viejo aunque el token técnicamente siga existiendo.
  if v_status <> 'active' then
    return jsonb_build_object('status', 'invalid');
  end if;

  begin
    insert into public.attendances (gym_id, member_id)
    values (v_gym_id, v_member_id)
    returning checked_in_at into v_checked_in_at;

    return jsonb_build_object(
      'status', 'success',
      'member_name', trim(concat(v_first_name, ' ', coalesce(v_last_name, ''))),
      'checked_in_at', v_checked_in_at
    );
  exception when unique_violation then
    -- Ya hay un registro de hoy (lo garantiza el índice único de
    -- 003_attendance_unique_day.sql). El más reciente SIEMPRE es el de hoy
    -- porque no puede existir una asistencia futura.
    select a.checked_in_at into v_checked_in_at
    from public.attendances a
    where a.member_id = v_member_id
    order by a.checked_in_at desc
    limit 1;

    return jsonb_build_object(
      'status', 'already_checked_in',
      'member_name', trim(concat(v_first_name, ' ', coalesce(v_last_name, ''))),
      'checked_in_at', v_checked_in_at
    );
  end;
end;
$$;

revoke all on function public.checkin_by_qr_token(text, text) from public;
grant execute on function public.checkin_by_qr_token(text, text) to anon;
grant execute on function public.checkin_by_qr_token(text, text) to authenticated;
