# Constano

SaaS de entrenamiento y retención para gimnasios de musculación tradicional.

## Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (ya instalados: button, input, label, card, table, dialog, form, dropdown-menu, avatar, badge, sonner, select, textarea, skeleton)
- date-fns (formateo de fechas, locale es)
- Supabase (PostgreSQL + Auth + Storage)
- Multi-tenant: cada gimnasio es un tenant, aislado por gym_id + Row Level Security

## Diferencial del producto
- Rutinas mensuales por alumno (musculación)
- Módulo de retención: detecta alumnos en riesgo de darse de baja
- NO competimos en gestión administrativa (cobros/tienda) contra My Gym Online

## Convenciones
- Server Components por default, "use client" solo cuando hace falta
- Formularios con react-hook-form + zod
- shadcn/ui para componentes
- Todas las queries a Supabase pasan por lib/supabase/client.ts o server.ts
- Idioma de UI: español (Argentina)

## Modelo de datos (ya creado en Supabase)
Tablas: gyms, users, members, plans, memberships, payments, attendances,
routines, routine_days, routine_exercises, retention_rules, retention_alerts.
Todas tienen gym_id para multi-tenancy.

## Estado actual
- Semana 0 completada: proyecto creado, deployado en Vercel, Supabase conectado, 12 tablas creadas con RLS activo.
- Semana 1 completada: auth con Supabase (login, signup, logout), multi-tenancy con RLS, signup usa trigger de Postgres (handle_new_user en supabase/migrations/002_signup_trigger.sql) que crea automáticamente el gym + user en public.users al insertar en auth.users. Dashboard protegido funcionando.
- Semana 2 en curso: módulo de alumnos, Bloque A (listado + alta) implementado:
  - lib/auth/get-gym-id.ts: getCurrentGymId() cacheada con React cache().
  - lib/validations/member.ts: zod schema compartido (form cliente + Server Action).
  - app/(dashboard)/dashboard/alumnos/page.tsx: listado (Server Component) con búsqueda, filtro por estado, paginación de 20, estado vacío.
  - components/alumnos/alumnos-filtros.tsx: buscador con debounce + select de estado, vía searchParams.
  - app/(dashboard)/dashboard/alumnos/nuevo/{page.tsx,actions.ts}: alta con react-hook-form + zod, Server Action `createMember`.
  - types/db.ts: tipo `Member` escrito a mano (no se generaron tipos con `supabase gen types` por falta de acceso al proyecto).
  - **Pendiente**: no se pudo verificar el alta end-to-end por el bug crítico de abajo (RLS/trigger de signup). El resto (listado vacío, sidebar, formulario, select, validaciones) sí se probó visualmente en el browser.

## 🔴 Bug crítico pendiente: RLS/trigger de signup desincronizado en Supabase
Al probar el Bloque A (2026-08-20) se detectó que **el signup ya no crea el gym ni la fila en `public.users`**:
- Se creó una cuenta nueva de prueba vía `/signup`; el signup devuelve sesión OK, pero luego `public.users` no tiene fila para ese `auth.uid()` (`PGRST116 - 0 rows`).
- Se confirmó con un test directo: usando la sesión ya autenticada del browser, un INSERT a `public.gyms` (que según `supabase/migrations/001_enable_rls.sql`, policy `gyms_insert_authenticated`, debería permitirse a cualquier `authenticated` con `check(true)`) fue **rechazado por RLS** (`42501`).
- Conclusión: **las políticas RLS reales en el proyecto de Supabase no coinciden con lo que hay en `supabase/migrations/001_enable_rls.sql` y/o `002_signup_trigger.sql`**. Lo más probable es que esos archivos de migración nunca se aplicaron contra el proyecto remoto (o se aplicó una versión vieja) — son historial local, no la fuente de verdad de lo que corre en Supabase.
- **Impacto**: ningún usuario nuevo que se registre hoy queda operativo (sin gym, sin fila en `users`, el dashboard y cualquier alta de datos van a fallar).
- **Cómo revisarlo**: entrar al SQL Editor de Supabase y correr `select * from pg_policies where tablename = 'gyms';` y `select tgname from pg_trigger where tgname = 'on_auth_user_created';` para confirmar qué hay realmente aplicado, y re-aplicar 001 y 002 si falta algo (o usar `supabase db push` si el proyecto está linkeado).
- No se intentó arreglar desde acá: no había `SUPABASE_ACCESS_TOKEN`/CLI logueado ni service role key disponibles en este entorno.
- Quedaron 2 usuarios de prueba huérfanos en Supabase Auth (sin gym): `ana.prueba.constano@example.com` y `constano.debug.20260820b@example.com`. Se pueden borrar desde Authentication > Users cuando se arregle esto.

## Bugs de componentes (base-nova / Base UI) encontrados y arreglados
Se van sumando acá porque el CLI de shadcn para este preset (`base-nova` sobre `@base-ui/react`, no Radix) a veces genera componentes que necesitan un ajuste manual de uso (no siempre es el componente el que está mal, a veces falta wiring):
- **form.tsx**: escrito a mano (no viene del CLI), ver nota original más abajo.
- **Button + `render={<Link .../>}`**: Base UI's Button tiene `nativeButton={true}` por default y tira un console error si se lo hace renderizar como algo que no es un `<button>` nativo (ej. un `<Link>` de Next). Solución: pasar siempre `nativeButton={false}` junto con `render={<Link .../>}`.
- **Select necesita el prop `items`**: `<Select>` (base-nova) no muestra el label del item seleccionado en `<SelectValue>` a menos que se le pase `items={{ value: "Label", ... }}` en el `<Select>` raíz. Sin eso, `SelectValue` muestra el `value` crudo en vez del texto del `<SelectItem>`. Ver `lib/validations/member.ts` (`weeklyFrequencyItems`) y `components/alumnos/alumnos-filtros.tsx` (`ESTADOS_ITEMS`) para el patrón a repetir.

## Aclaraciones importantes
- NO existe tabla `profiles`. La tabla de staff se llama `users` y linkea con auth.users por id.
- El gym_id del user actual se obtiene consultando public.users filtrando por auth.uid().
- Ya existen: lib/supabase/client.ts, lib/supabase/server.ts, lib/supabase/middleware.ts, proxy.ts en la raíz (Next.js 16 usa proxy.ts en vez de middleware.ts).
- El componente form.tsx está escrito a mano (no viene del CLI de shadcn) porque el proyecto usa base-nova sobre Base UI,
