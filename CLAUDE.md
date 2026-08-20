# Constano

SaaS de entrenamiento y retención para gimnasios de musculación tradicional.

## Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (ya instalados: button, input, label, card, table, dialog, form, dropdown-menu, avatar, badge, sonner, select, textarea, skeleton, tabs, alert-dialog)
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
- Semana 2 en curso: Bloque B (detalle + edición) implementado:
  - lib/members.ts: helpers compartidos entre listado y detalle — `ESTADO_BADGE`, `frecuenciaLabel`, `getInitials`, `nombreCompleto`, `parseFechaLocal`.
  - components/alumnos/member-form.tsx: el form de alta/edición se extrajo acá (antes vivía solo en `nuevo/page.tsx`); recibe `defaultValues`/`onSubmit`/textos por props. Lo usan tanto `nuevo/page.tsx` como `[id]/editar/editar-form.tsx`.
  - app/(dashboard)/dashboard/alumnos/[id]/page.tsx: detalle (Server Component) con tabs (Info/Rutinas/Asistencia/Pagos — las últimas 3 son placeholder), WhatsApp, edad calculada, botón Editar y dropdown de acciones.
  - components/alumnos/alumno-acciones.tsx: dropdown "Más acciones" (Pausar/Reactivar, Dar de baja) con AlertDialog de confirmación por cada acción.
  - app/(dashboard)/dashboard/alumnos/[id]/actions.ts: Server Actions `updateMemberStatus` y `updateMember`.
  - app/(dashboard)/dashboard/alumnos/[id]/editar/{page.tsx,editar-form.tsx}: edición, reutiliza `MemberForm`.
  - **Probado end-to-end en el browser contra datos reales de la cuenta del usuario** (gym "Setteria"): entrar al detalle, editar (teléfono/frecuencia/notas), pausar, reactivar, WhatsApp (abre en pestaña nueva, número limpio de espacios/+). Todo funcionando. No se probó "Dar de baja" para no alterar el estado del alumno real de la cuenta (el mecanismo es idéntico a Pausar/Reactivar, que sí se probó).

## Bug de timezone en fechas (encontrado y arreglado en Bloque B)
Los campos `date` de Postgres (`birth_date`, `joined_at`) llegan del cliente de Supabase como string `"YYYY-MM-DD"`. Formatearlos con `date-fns format(new Date(fecha), ...)` los interpreta como medianoche **UTC**, y al renderizar en una zona horaria negativa (Argentina, UTC-3) el día se corre uno para atrás — se detectó comparando el detalle (mostraba 19/08) contra el form de edición, que muestra el string crudo (20/08, el valor correcto).
- **Fix**: usar `parseFechaLocal(fecha)` de `lib/members.ts` (hace `new Date(`${fecha}T00:00:00`)`, que JS interpreta en hora local) en vez de `new Date(fecha)` directo, siempre que se formatee o se calculen diferencias (ej. edad) sobre un campo `date` de la tabla `members`.
- Ya aplicado en el listado (columna Alta) y en el detalle (Fecha de nacimiento, Fecha de alta, cálculo de edad). Si se agregan más pantallas que muestren `birth_date`/`joined_at`/`created_at`-como-fecha, usar el mismo helper.

## 🟢 Bug de RLS/trigger de signup: resuelto
El bug crítico reportado en Bloque A (signup no creaba gym/user por políticas RLS desincronizadas) ya no reproduce: al probar Bloque B había una sesión real funcionando (gym "Setteria") con datos cargados. No se investigó qué se corrigió del lado de Supabase, solo se confirma que el flujo completo (login → dashboard → alumnos → detalle → editar) funciona de punta a punta ahora.
- Quedan pendientes de limpieza en Supabase Auth (Authentication > Users) 2 usuarios de prueba huérfanos de esa sesión de debugging: `ana.prueba.constano@example.com` y `constano.debug.20260820b@example.com`.

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
