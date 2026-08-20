create or replace function public.current_gym_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select gym_id
  from public.users
  where id = auth.uid()
$$;

grant execute on function public.current_gym_id() to authenticated;


alter table public.gyms enable row level security;
alter table public.users enable row level security;
alter table public.members enable row level security;
alter table public.plans enable row level security;
alter table public.memberships enable row level security;
alter table public.payments enable row level security;
alter table public.attendances enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.retention_rules enable row level security;
alter table public.retention_alerts enable row level security;


drop policy if exists "gyms_select_own" on public.gyms;
create policy "gyms_select_own"
  on public.gyms
  for select
  to authenticated
  using (id = public.current_gym_id());

drop policy if exists "gyms_update_owner" on public.gyms;
create policy "gyms_update_owner"
  on public.gyms
  for update
  to authenticated
  using (
    id = public.current_gym_id()
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'owner'
    )
  )
  with check (
    id = public.current_gym_id()
    and exists (
      select 1 from public.users
      where users.id = auth.uid()
        and users.role = 'owner'
    )
  );

drop policy if exists "gyms_insert_authenticated" on public.gyms;
create policy "gyms_insert_authenticated"
  on public.gyms
  for insert
  to authenticated
  with check (true);


drop policy if exists "users_select_same_gym" on public.users;
create policy "users_select_same_gym"
  on public.users
  for select
  to authenticated
  using (gym_id = public.current_gym_id());

drop policy if exists "users_insert_self" on public.users;
create policy "users_insert_self"
  on public.users
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self"
  on public.users
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());


drop policy if exists "members_all_same_gym" on public.members;
create policy "members_all_same_gym"
  on public.members
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "plans_all_same_gym" on public.plans;
create policy "plans_all_same_gym"
  on public.plans
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "memberships_all_same_gym" on public.memberships;
create policy "memberships_all_same_gym"
  on public.memberships
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "payments_all_same_gym" on public.payments;
create policy "payments_all_same_gym"
  on public.payments
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "attendances_all_same_gym" on public.attendances;
create policy "attendances_all_same_gym"
  on public.attendances
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "routines_all_same_gym" on public.routines;
create policy "routines_all_same_gym"
  on public.routines
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "retention_rules_all_same_gym" on public.retention_rules;
create policy "retention_rules_all_same_gym"
  on public.retention_rules
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());

drop policy if exists "retention_alerts_all_same_gym" on public.retention_alerts;
create policy "retention_alerts_all_same_gym"
  on public.retention_alerts
  for all
  to authenticated
  using (gym_id = public.current_gym_id())
  with check (gym_id = public.current_gym_id());


drop policy if exists "routine_days_all_same_gym" on public.routine_days;
create policy "routine_days_all_same_gym"
  on public.routine_days
  for all
  to authenticated
  using (
    exists (
      select 1 from public.routines
      where routines.id = routine_days.routine_id
        and routines.gym_id = public.current_gym_id()
    )
  )
  with check (
    exists (
      select 1 from public.routines
      where routines.id = routine_days.routine_id
        and routines.gym_id = public.current_gym_id()
    )
  );


drop policy if exists "routine_exercises_all_same_gym" on public.routine_exercises;
create policy "routine_exercises_all_same_gym"
  on public.routine_exercises
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.routine_days
      join public.routines on routines.id = routine_days.routine_id
      where routine_days.id = routine_exercises.routine_day_id
        and routines.gym_id = public.current_gym_id()
    )
  )
  with check (
    exists (
      select 1
      from public.routine_days
      join public.routines on routines.id = routine_days.routine_id
      where routine_days.id = routine_exercises.routine_day_id
        and routines.gym_id = public.current_gym_id()
    )
  );
