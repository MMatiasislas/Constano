-- Policies para el bucket "gym-assets" (creado a mano en el dashboard, ver
-- instrucciones aparte). Mismo patrón que "member-photos": cada gym solo
-- puede leer/escribir/actualizar/borrar dentro de su propia carpeta
-- {gym_id}/, usando la función public.current_gym_id() ya creada en
-- 001_enable_rls.sql. El bucket es público (la URL pública no pasa por
-- estas policies), así que esto rige el acceso vía API autenticada
-- (upload/list/remove desde el server).

drop policy if exists "gym_assets_select_own" on storage.objects;
create policy "gym_assets_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

drop policy if exists "gym_assets_insert_own" on storage.objects;
create policy "gym_assets_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

drop policy if exists "gym_assets_update_own" on storage.objects;
create policy "gym_assets_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  )
  with check (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );

drop policy if exists "gym_assets_delete_own" on storage.objects;
create policy "gym_assets_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'gym-assets'
    and (storage.foldername(name))[1] = public.current_gym_id()::text
  );
