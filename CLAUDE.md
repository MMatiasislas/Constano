# Constano

SaaS de entrenamiento y retención para gimnasios de musculación tradicional.

## Stack
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (ya instalados: button, input, label, card, table, dialog, form, dropdown-menu, avatar, badge, sonner, select, textarea, skeleton, tabs, alert-dialog)
- date-fns (formateo de fechas, locale es)
- browser-image-compression (comprime fotos de alumnos en el cliente antes de subirlas)
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
  - **Probado end-to-end en el browser contra datos reales de la cuenta del usuario** (gym "Setteria"): entrar al detalle, editar (teléfono/frecuencia/notas), pausar, reactivar, WhatsApp (abre en pestaña nueva, número limpio de espacios/+), y "Dar de baja" (probado con un alumno de prueba, ver Bloque C). Todo funcionando.
- Semana 2 en curso: Bloque C (foto de alumno con Supabase Storage) implementado:
  - **Bucket**: `member-photos` en Supabase Storage (público, 5MB máx, jpg/png/webp). Estructura: `member-photos/{gym_id}/{member_id}.{ext}` — un solo archivo por alumno, `ext` es `jpg`/`png`/`webp` según el tipo subido. Policies ya configuradas en Supabase: cada gym solo puede leer/escribir/borrar dentro de su propia carpeta `{gym_id}/`.
  - lib/storage/photo-validation.ts: validación pura (sin imports de servidor) — `MAX_PHOTO_SIZE_BYTES`, `PHOTO_EXT_BY_MIME`, `validateMemberPhotoFile()`. La usan tanto el componente cliente (feedback instantáneo) como el helper de servidor (autoridad final).
  - lib/storage/member-photos.ts: `uploadMemberPhoto(file, gymId, memberId)` y `deleteMemberPhoto(photoUrl, gymId, memberId)`. Corren en el servidor (usan `lib/supabase/server.ts`), llamadas desde Server Actions — NO desde componentes cliente. `deleteMemberPhoto` borra las 3 extensiones posibles por robustez (si el alumno tuvo un .jpg y ahora sube un .png, no queda el .jpg viejo huérfano). La URL pública devuelta lleva `?v=timestamp` para evitar que el browser cachee la imagen vieja tras un upsert al mismo path.
  - components/alumnos/photo-upload.tsx (client): Avatar grande + botón "Subir foto" (dispara un `<input type=file>` oculto vía ref) + "Eliminar foto" (solo si hay preview) + preview inmediato con `URL.createObjectURL`. Si el archivo pesa más de 5MB, comprime con `browser-image-compression` (`maxSizeMB: 4, maxWidthOrHeight: 1600`) antes de validar tamaño final. El estado del archivo elegido/eliminado vive en el componente y sube a `MemberForm` por `onChange(file, removed)` — NO se mete en el schema zod del form (el upload va aparte, después del submit).
  - components/alumnos/member-form.tsx: ahora acepta `initialPhotoUrl` y cambió la firma de `onSubmit` a `(values, photo: PhotoChange) => ...` donde `PhotoChange = { file: File | null; removed: boolean }`.
  - **Flujo de alta** (`nuevo/actions.ts`, `createMember(values, photoFile)`): primero inserta el member (sin foto) para tener el `id`, recién ahí sube la foto y hace un segundo `update` con el `photo_url`. Si el upload falla, el alumno queda creado sin foto (no se aborta la creación) y se devuelve `{ success: true, warning: "..." }`; la página muestra `toast.warning("Alumno creado", { description: warning })` en vez de `toast.success`.
  - **Flujo de edición** (`[id]/actions.ts`, `updateMember(id, values, photo)`): si `photo.file` viene con contenido, borra la foto previa (si había) y sube la nueva; si `photo.removed` es true y había foto, la borra y deja `photo_url: null`. Igual que en alta, un fallo de Storage no aborta el guardado de los demás campos — se devuelve `warning` y el toast queda diferenciado.
  - **Server Actions reciben el `File` directo como argumento** (no FormData) — Next.js 15+ lo serializa sin problema al llamarlas desde un Client Component. Confirmado andando en el browser.
  - **Gotcha real encontrado y arreglado**: el límite default de Next.js para el body de Server Actions es **1MB**, y una foto de alumno (incluso comprimida) lo supera fácil → tira `Error: Body exceeded 1 MB limit.` en runtime (no rompe en build/tsc, solo se ve al ejecutar). Fix en `next.config.ts`: `experimental.serverActions.bodySizeLimit: "6mb"`. **Hay que reiniciar el dev server** después de tocar `next.config.ts` (no hace hot-reload).
  - **Límite conocido, no arreglado**: la validación de tipo de archivo confía en el `file.type` que reporta el browser (basado en la extensión), no en el contenido real. Un archivo de texto renombrado a `.jpg` pasa la validación y se sube; el `<AvatarImage>` simplemente no carga y el Avatar cae al fallback de iniciales (probado, no rompe nada, no tira error en consola) — pero el archivo basura queda en el bucket. Validar el contenido real (magic bytes) quedaría para más adelante si se vuelve un problema real.
  - **Probado end-to-end en el browser**: alta con foto (subida real, aparece en listado y detalle), edición reemplazando la foto (borra la vieja, sube la nueva, cache-bust funciona), edición eliminando la foto (vuelve a mostrar iniciales), archivo >5MB (comprime automático y sube bien), archivo con MIME/contenido inválido (fallback gracioso, sin crashear). Se creó un alumno de prueba "Foto Testing" para estas pruebas y se dio de baja al terminar (queda en Supabase, no se borró — no hay función de borrado duro de alumnos todavía).

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
