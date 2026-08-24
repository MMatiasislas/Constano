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
- Semana 3 arrancando: módulo de rutinas, Bloque A (biblioteca de ejercicios) implementado:
  - `exercises_library` ya venía seedeada en Supabase con ~79 ejercicios globales (`gym_id = null`) en 9 grupos musculares. RLS: SELECT ve globales + custom del propio gym; INSERT/UPDATE/DELETE solo alcanzan filas del propio gym (un global nunca se puede tocar, ni intentándolo a mano).
  - types/db.ts: `MUSCLE_GROUPS` (array `as const` con los 9 grupos) + tipo `MuscleGroup` + tipo `Exercise`.
  - lib/validations/exercise.ts: `exerciseFormSchema` (zod), `muscleGroupOptions`/`muscleGroupItems` — mismo patrón sentinel `"ninguno"` que `weekly_frequency` en alumnos (Select siempre necesita un string, no puede ser `undefined`).
  - lib/exercises.ts: `muscleGroupBadgeClass()` — paleta de 9 colores Tailwind distintos, uno por grupo (rose/blue/amber/orange/violet/fuchsia/emerald/red/cyan), con fallback gris para `null` o un valor que no matchee.
  - app/(dashboard)/dashboard/ejercicios/page.tsx: listado (Server Component) con búsqueda (debounce), filtro por grupo, toggle "Todos | Solo personalizados" — todo por searchParams. El toggle "solo personalizados" filtra con `.not("gym_id", "is", null)` en vez de comparar contra el gym_id propio: como RLS ya garantiza que cualquier fila visible con `gym_id` no nulo es del propio gym, no hace falta llamar a `getCurrentGymId()` en esta página.
  - **Patrón nuevo: alta/edición/borrado en Dialog inline** (no páginas separadas, más rápido para el usuario) — primera vez que se usa este patrón en el proyecto, documentado por si se reusa en otros módulos:
    - components/ejercicios/ejercicio-form.tsx: form compartido (create/edit) que vive DENTRO de un `<DialogContent>` ya abierto por el padre — no renderiza su propio `<Dialog>`, solo `<Form>` + `<DialogFooter>` con `DialogClose` como botón "Cancelar".
    - components/ejercicios/nuevo-ejercicio-dialog.tsx y editar-ejercicio-dialog.tsx: cada uno maneja su propio `open` state, envuelven `<ExerciseForm>` dentro de `<Dialog><DialogContent>`, y en `onSubmit` exitoso hacen `setOpen(false)` + `router.refresh()`.
    - components/ejercicios/borrar-ejercicio-dialog.tsx: `AlertDialog` NO controlado (a diferencia de `alumno-acciones.tsx` en Bloque B) — acá el trigger es un botón standalone en la fila, no está anidado dentro de un DropdownMenu que se cierra solo, así que no hace falta manejar `open` a mano.
    - Ambos Dialog/AlertDialog trigger usan `render={<Button .../>}` (Button es el render target, no hace falta `nativeButton={false}` — ese gotcha solo aplica cuando Button es quien recibe el `render`, no cuando lo recibe).
  - app/(dashboard)/dashboard/ejercicios/actions.ts: `createExercise`/`updateExercise` (chequean nombre duplicado dentro del gym con `.ilike()` antes de insertar/actualizar, error claro si ya existe) y `deleteExercise` (sin chequeos extra — RLS ya protege).
  - Sidebar: "Ejercicios" agregado entre "Alumnos" y "Rutinas" (ícono `LibraryIcon`).
  - **Probado end-to-end en el browser**: carga de los 79 ejercicios globales, filtro por grupo muscular (Pecho → 9 resultados), búsqueda "press" (9 resultados, distintos grupos), alta de un ejercicio custom vía Dialog, badge "Personalizado" visible, edición (nombre + grupo), borrado con el texto de confirmación exacto pedido, confirmado que los globales muestran "—" en Acciones (sin botones). Sin errores de consola en toda la sesión.

- Semana 3, Bloque B.1 (rutinas 1-a-1: listado + crear con días) implementado. Las plantillas (`routine_templates`, `routine_template_days`, `routine_template_exercises`) ya existen en Supabase pero quedan para B.3, no se tocaron.
  - types/db.ts: `MESES`, `Routine`, `RoutineDay`, `RoutineExercise` (este último sin uso todavía, preparado para el editor de ejercicios), `RoutineWithDayCount`, `RoutineWithDays`.
  - lib/validations/routine.ts: `monthOptions`/`monthItems` (sentinel `"ninguno"`, mismo patrón que `weekly_frequency`/`muscle_group`), `dayCountOptions` (1-7, solo UI, no va al schema), `routineFormSchema` (title + month_number + notes + `days` array vía `useFieldArray`, min 1 máx 7), `routineInfoFormSchema` (mismos campos sin `days`, para el dialog de editar información), `routineDayNameSchema` (agregar/renombrar día).
  - lib/routines.ts: `monthLabel()` para mostrar el nombre del mes en la vista de rutina.
  - app/(dashboard)/dashboard/alumnos/[id]/rutinas/actions.ts: `createRoutine` (inserta routine + N routine_days en un solo flujo, si falla el insert de días borra la routine para no dejar una huérfana sin días), `deleteRoutine`, `updateRoutineInfo`, `addRoutineDay` (calcula `day_number`/`order_index` como max+1 de los días existentes), `renameRoutineDay`, `deleteRoutineDay`. Ninguna de estas tablas tiene `ON DELETE CASCADE` confirmado, así que `deleteRoutine`/`deleteRoutineDay` borran `routine_exercises` a mano antes de borrar el padre.
  - Tab "Rutinas" del detalle del alumno (antes placeholder) ahora lista las rutinas del alumno con conteo de días vía `.select("*, routine_days(count)")` (embedded count de supabase-js, funciona sin problema con la FK existente). Estado vacío + botón "Nueva rutina"/"Crear la primera" (mismo componente `NuevaRutinaDialog`, label distinto).
  - components/rutinas/nueva-rutina-dialog.tsx: dialog con `useFieldArray` — el Select "Cantidad de días" no es un campo del form, solo dispara `append`/`remove` sobre el field array para mostrar N inputs de nombre. Al crear, redirige (`router.push`, no `redirect()` de servidor) a la vista de la rutina nueva.
  - Vista de rutina (`[id]/rutinas/[routineId]/page.tsx`): breadcrumb, botón Volver, `EditarInfoRutinaDialog`, botón "Exportar PDF" disabled. Valida `routine.member_id === id` y hace `notFound()` si no matchea.
  - components/rutinas/rutina-dias-tabs.tsx: Tabs de Base UI con los días. **Patrón nuevo**: en vez de sincronizar la tab activa con un `useEffect` + `setState` (dispara error de lint `react-hooks/set-state-in-effect`, cascading renders), se deriva en el render: `resolvedActiveDayId = days.some(d => d.id === activeDayId) ? activeDayId : days[0]?.id`. Así, si el día activo se borra, automáticamente cae al primero sin efecto extra. Reusar este patrón si aparece el mismo caso (estado que puede quedar obsoleto por props que cambian).
  - Los botones Renombrar/Eliminar de cada día viven DENTRO del `TabsContent` (no al lado del `TabsTrigger`): anidar un dropdown/botón dentro del trigger de un Tab de Base UI mete un `<button>` dentro de otro `<button>`, HTML inválido. Se optó por mostrarlos en el panel del día seleccionado.
  - No hay componente `Tooltip` en el proyecto (`components/ui/` no lo tiene). Para "Duplicar" y "Exportar PDF" (disabled, "Próximamente") se usó `title` nativo del browser en vez de instalar un componente nuevo — simple y sin riesgo de bugs de Base UI.
  - **Probado end-to-end en el browser contra datos reales** (gym "Setteria", alumno "Matias islas"): estado vacío → crear rutina "Agosto 2026" con 3 días (Torso/Pierna/Empuje) → redirige a la vista con 3 tabs → agregar día "Cardio" (D4, autoseleccionado) → renombrar a "Cardio y Core" → eliminar ese día (vuelve solo al primer tab) → editar información (título a "Agosto 2026 - Bloque 1") → volver al alumno, la card muestra el título actualizado y "3 días" → eliminar la rutina desde el listado → vuelve al estado vacío. Sin errores de consola en toda la sesión.
- Semana 3, Bloque B.2 (editor de ejercicios dentro de cada día, con drag & drop) implementado. Dependencia nueva: `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`.
  - **Aclaración de tipos real vs lo asumido en B.1**: `routine_exercises.weight` es `number` (kg), no `string` — se corrigió `RoutineExercise` en `types/db.ts`. `reps` sí es texto libre (varchar), tal cual se había asumido.
  - lib/validations/routine.ts: `routineExerciseDetailsSchema` (sets/reps/weight/rest_seconds/notes — los campos editables en los dialogs) y `routineExerciseSchema` (agrega `name`+`muscle_group`, para validar el payload completo server-side). Los campos numéricos son **strings en el form** (`numericStringField()` helper: valida rango/entero sobre el string, permite vacío) y se convierten a `number | null` recién en el Server Action (`toNullableInt`/`toNullableFloat` en `actions.ts`) — mismo patrón sentinel-string-en-el-form que `month_number`/`weekly_frequency`.
  - app/(dashboard)/dashboard/alumnos/[id]/rutinas/[routineId]/actions.ts (nuevo, separado del `actions.ts` de B.1 que vive un nivel arriba): `addExerciseToDay`, `updateExercise`, `deleteExercise`, `reorderExercises`. Cada uno valida "doble candado" que el `routine_day`/`routine_exercise` pertenezca a una `routine` del gym actual (`getRoutineDayContext()`: dos queries encadenadas simples, sin embeds anidados — se prefirió sobre un filtro `.eq("routine_days.routines.gym_id", ...)` con `!inner` por ser más legible y menos frágil). Esa misma función devuelve `routineId`/`memberId` para poder armar el `revalidatePath` sin que el cliente tenga que pasarlos.
  - `deleteRoutine`/`deleteRoutineDay` (B.1) y `deleteExercise`/`reorderExercises` (B.2) no asumen `ON DELETE CASCADE` en Supabase — borran explícito de abajo hacia arriba (`routine_exercises` antes que `routine_days`, etc.).
  - components/rutinas/editor-ejercicios-dia.tsx: Client Component con `DndContext`/`SortableContext` de dnd-kit. **Gotcha real (confirmado con error de hidratación en consola, no solo teórico)**: dnd-kit genera el id del elemento `aria-describedby` con un contador interno que no coincide entre el render de servidor y el de cliente → React tira "hydration mismatch" en consola (`DndDescribedBy-0` vs `-1`). Fix: pasarle un `id` explícito y estable al `DndContext` (acá `` `routine-day-${routineDayId}` ``) en vez de dejar que use su contador automático. **Aplicar este mismo fix a cualquier otro `DndContext` que se agregue en SSR/Next.**
    - Reordenamiento optimista: estado local `items` que se actualiza al soltar (antes de esperar la respuesta del server), y se revierte con `toast.error` si `reorderExercises` falla. Sync de `items` con la prop `ejercicios` (que cambia cuando el padre Server Component refetchea tras un add/delete) usando el patrón de React docs "ajustar estado durante el render" (`if (ejercicios !== prevEjercicios) { setPrevEjercicios(ejercicios); setItems(ejercicios); }`), no un `useEffect` — mismo motivo que en `rutina-dias-tabs.tsx` de B.1 (evita el lint `react-hooks/set-state-in-effect`).
    - `detalleEjercicio()`: arma la línea "4 series × 8-10 reps · 80kg · 90" descanso", omitiendo cualquier campo vacío (probado con los 3 casos: todo cargado, sin peso, y solo con notas sin sets/reps).
  - components/rutinas/agregar-ejercicio-dialog.tsx: dialog de 2 pasos (buscar en `exercises_library` → cargar detalles). La biblioteca completa (79+ ejercicios) se trae **una sola vez por sesión del dialog** con el cliente Supabase del browser (`lib/supabase/client.ts`, no un Server Action) y se filtra 100% client-side (búsqueda + grupo muscular) — se usa un `useRef` (`hasFetchedRef`) para no re-fetchear en cada apertura, no un `useState` de loading seteado sincrónicamente en el efecto (mismo gotcha de lint que en B.1: `setLoadingLibrary(true)` síncrono dentro de un `useEffect` dispara `react-hooks/set-state-in-effect`; se resolvió inicializando el estado en `true` y sólo bajándolo a `false` dentro del `.then()`).
  - components/rutinas/editar-ejercicio-dialog.tsx y components/rutinas/ejercicio-detalles-fields.tsx: el form de edición NO permite cambiar el ejercicio (nombre/grupo son fijos, snapshot al momento de agregarlo) — si el profe se equivoca de ejercicio, lo borra y agrega el correcto. `EjercicioDetallesFields` es el bloque de campos (sets/reps/weight/rest/notes) compartido entre "agregar" (paso 2) y "editar", para no duplicar ~60 líneas de JSX casi idéntico.
  - Query de la vista de rutina (`[routineId]/page.tsx`) ahora trae los ejercicios anidados: `.select("*, routine_days(*, routine_exercises(*)), members(...)")` con doble `.order()` (uno por `referencedTable: "routine_days"`, otro por `referencedTable: "routine_days.routine_exercises"`) — el ordenamiento anidado por dot-path funciona bien en supabase-js.
  - **Probado end-to-end en el browser contra datos reales**: rutina nueva con día "Torso" vacío → agregar 3 ejercicios (uno completo con peso, uno sin peso, uno solo con notas largas y sin sets/reps) → cada card muestra exactamente lo esperado, omitiendo lo vacío → editar uno (series 3→4, reps "al fallo"→"12") → drag & drop funcionando (con movimientos cortos; un salto largo en un solo gesto no dispara suficientes eventos `pointermove` para que `closestCenter` calcule bien el destino — con mouse/touch real de un usuario esto no es un problema, dnd-kit dispara eventos continuos) → recargada la página, el nuevo orden persistió → eliminar un ejercicio → buscador probado con "press" y filtro por "Pecho", y también el estado vacío del buscador (sin resultados). Encontrado y arreglado en vivo el bug de hidratación del `DndContext` (ver arriba). Sin errores de consola después del fix.

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
  no Radix (usa `React.cloneElement` en vez de `Slot`).

## Semana 4 y Semana 5 Bloque A: no documentadas acá todavía
Este archivo no se actualizó cuando se hicieron el módulo de Asistencia (Semana 4) ni el CRUD de
reglas de retención (Semana 5, Bloque A) — quedaron documentados solo en la memoria de Claude
(`project_constano_saas.md`), no acá. Si hace falta el detalle de esos bloques (helpers de
timezone en `lib/attendance.ts`, gotchas de `markAttendance`, diseño del sentinel `0` en
`applies_to_frequency`, etc.), revisar esa memoria hasta que se pase a este archivo.

## Semana 5, Bloque B: motor de alertas de retención (completo, probado end-to-end)
`app/(dashboard)/dashboard/retencion/` (página + actions), `lib/retention-alerts-engine.ts`
(el motor), `lib/retention.ts` (agregado: `ruleAppliesToMember`, `findTriggeredRule`,
labels de estado/motivo), `components/retencion-alertas/`. El link "Retención" del sidebar ya
existía (apuntaba a esta página, que no existía hasta ahora).

- **No hay cron ni background jobs** (Next.js en Vercel, sin infra propia): el motor
  (`syncRetentionAlerts(gymId)`) se recalcula **en cada carga de `/dashboard/retencion`**, no en
  segundo plano. Para cada alumno activo calcula días sin asistencia (última asistencia real, o
  fecha de alta si nunca asistió, con `daysSinceInBA()` nuevo en `lib/attendance.ts` — mismo
  patrón de timezone Argentina que el resto del proyecto) y lo compara contra las reglas activas
  del gym con `findTriggeredRule()`: de las reglas que le aplican y ya se cumplieron, elige la de
  `days_without_attendance` más alto (la más exigente disparada), para no generar una alerta por
  cada regla que matchee a la vez.
- **Idempotencia por "racha de ausencia", no por estado de la alerta** (bug real encontrado y
  arreglado probando en vivo): la primera versión solo evitaba duplicar si el alumno tenía una
  alerta "abierta" (`active`/`contacted`). Al resolver o descartar una alerta, como el alumno
  seguía sin asistencia real, la alerta se volvía a crear en la carga siguiente de la página —
  se generaron 4 duplicados probando esto. Fix: ahora se compara contra la ÚLTIMA alerta del
  alumno sin importar su estado — si su `triggered_at` es posterior o igual a la fecha de
  referencia actual (última asistencia o alta), significa que ya se alertó por esta misma racha
  y no se crea una nueva. Solo se genera una alerta nueva de verdad si el alumno vuelve a asistir
  (la fecha de referencia avanza) y después vuelve a faltar.
- **Gotcha real de schema (no solo de código)**: la tabla `retention_alerts` real en Supabase NO
  tenía la columna `days_without_attendance` a pesar de que el tipo `RetentionAlert` en
  `types/db.ts` ya la declaraba desde Bloque A — el insert fallaba en silencio con
  `PGRST204 Could not find the 'days_without_attendance' column`. Se agregó la migración
  `supabase/migrations/004_retention_alert_resolution.sql` (agrega esa columna + `resolution_reason`,
  ambas con `add column if not exists`), que Matías corrió a mano en el SQL Editor. **Si aparece
  otro error `PGRST204` de "columna no encontrada", sospechar lo mismo: el tipo TS puede estar
  adelantado a la tabla real** — no asumir que porque el campo está en `types/db.ts` ya existe en
  Supabase.
- Estados de alerta (`RETENTION_ALERT_STATUSES` en `types/db.ts`): `active` → `contacted` (manual,
  sin form) → `resolved` (con motivo obligatorio de `RESOLUTION_REASON_OPTIONS` + nota opcional) o
  `dismissed` (falso positivo, solo nota opcional). Cualquiera de las dos últimas se puede
  `reopenAlert()` (vuelve a `active`, limpia motivo/nota/`resolved_at` — las tres, no solo el
  motivo: se encontró y arregló un caso donde la nota vieja quedaba pegada tras reabrir).
  `resolution_reason` es texto libre en la tabla (no hay CHECK constraint), igual que `status`
  desde Bloque A.
- **Patrón nuevo para Select requerido sin default obvio**: `ResolverAlertaDialog` necesitaba que
  el Select de motivo arrancara vacío (mostrando el placeholder "Elegí un motivo") en vez de
  pre-seleccionar una opción. Pasar `defaultValues: { resolution_reason: undefined }` a
  `useForm` tira un warning de consola de Base UI ("A component is changing the uncontrolled
  value state of Select to be controlled"). Fix: usar `""` como sentinel (cast a
  `ResolveAlertFormValues["resolution_reason"]`) en vez de `undefined` — el Select queda
  controlado desde el primer render y el schema de zod igual rechaza `""` con su mensaje
  ("Elegí un motivo"). Aplicar el mismo patrón si aparece otro Select requerido sin valor inicial
  natural.
- `lib/members.ts`: se extrajo `whatsappHref(phone, mensaje?)` (antes vivía duplicada como función
  local en `alumnos/[id]/page.tsx`) para reusarla en las alertas de retención con un mensaje
  precargado ("Hola {nombre}! Te extrañamos por el gym, ¿todo bien?").
- Dashboard de Inicio (`app/(dashboard)/dashboard/page.tsx`): las 3 cards (Alumnos/Rutinas/Alertas
  de retención) eran texto estático hardcodeado desde que se creó la Semana 0 ("Todavía no
  cargaste alumnos" aunque hubiera alumnos reales) — se conectaron a counts reales (`members`
  activos, `routines` totales, `retention_alerts` con status `active`/`contacted`) en esta misma
  sesión, a pedido de Matías.
- **Probado end-to-end en el browser contra datos reales** (gym "iron gym"): alumno de prueba
  "Alerta Testing" (3x/sem, fecha de alta 20 días atrás, sin asistencia cargada) → el motor generó
  la alerta correctamente (21 días sin venir, regla de "3x/sem, 12 días") → contactar → resolver
  con motivo "Volvió a entrenar" + nota → reabrir (nota se limpia) → descartar con nota → filtro
  por estado (activas/contactadas/resueltas/descartadas/todas) y buscador probados → link de
  WhatsApp con mensaje precargado confirmado. Alumno de prueba dado de baja al terminar (mismo
  criterio que "Foto Testing" en Semana 2: no se borra, queda inactivo). Sin errores ni warnings
  de consola después de los dos fixes de arriba.
- **Nota de datos reales, no un bug de esta sesión**: mientras se probaba, la regla de retención
  real del gym (antes "Regla editada") apareció renombrada a "alunb" — no fue una acción de esta
  sesión (no hay ningún click ni tipeo registrado sobre ese campo). Es la primera vez que se
  confirma que el browser de estas sesiones puede tener actividad humana concurrente de Matías en
  paralelo; si el nombre no era intencional, renombrarla de nuevo desde
  `/dashboard/configuracion/retencion`.

## Semana 5, Bloque C: mensaje de WhatsApp configurable + badge en sidebar (cierra la Semana 5)
- **`gyms.settings` (jsonb, `supabase/migrations/005_gym_settings.sql`, default `{}`)**: columna de
  propósito general para config del gym que no amerita su propia columna/migración. Hoy solo tiene
  una key: `retention_message` (string | ausente = usa el default). **Si se agrega otra key acá en
  el futuro, hacerlo como merge (`{ ...currentSettings, nuevaKey: valor }`), nunca sobreescribiendo
  el objeto entero** — `updateRetentionMessage` en
  `app/(dashboard)/dashboard/configuracion/mensajes/actions.ts` ya sigue ese patrón (lee, mergea,
  actualiza) precisamente para no pisar otras keys que se sumen más adelante.
- `lib/retention.ts` (agregado): `DEFAULT_WHATSAPP_TEMPLATE`, `getWhatsAppTemplate(gymSettings)`
  (resuelve custom vs. default), `renderWhatsAppMessage(template, nombre, dias, gym)` (reemplaza
  `{nombre}`/`{dias}`/`{gym}`), `buildWhatsAppMessage(nombre, dias, gym, template?)` (wrapper que ya
  resuelve el default si `template` viene `null`/vacío — usado directo desde `AlertaCard`).
- **Decisión no obvia al "restaurar mensaje por defecto"**: al guardar, si el texto del textarea es
  idéntico al `DEFAULT_WHATSAPP_TEMPLATE` actual, se guarda `retention_message: null` en vez del
  texto literal (ver `updateRetentionMessage`). Así, si el default se cambia en el código más
  adelante, un gym que "restauró" sigue recibiendo el default nuevo en vez de quedar pegado a una
  copia congelada del default de hoy. El botón "Restaurar mensaje por defecto" del form
  (`components/mensajes/mensaje-retencion-form.tsx`) solo pisa el textarea en el cliente — hay que
  tocar "Guardar cambios" para que se persista (mismo flujo de 2 pasos que el resto de los forms).
- `app/(dashboard)/dashboard/configuracion/mensajes/`: página + `actions.ts`
  (`updateRetentionMessage`). Preview en vivo con `useWatch` (mismo patrón que
  `regla-form.tsx`/Bloque A), datos de ejemplo fijos (Juan Pérez, 10 días, nombre real del gym).
  Límite de 500 caracteres (`lib/validations/retention-message.ts`).
- **Badge de alertas en el sidebar**: se decidió resolver la data en `app/(dashboard)/layout.tsx`
  (Server Component compartido por todo el dashboard) y pasarla como prop a `SidebarNav` (Client
  Component) — no hay Suspense, la query corre en paralelo (`Promise.all`) con la del perfil que ya
  existía, mismo costo de latencia que antes.
  - **El badge cuenta solo `status = 'active'`, NO `active + contacted`** — desviación a propósito
    del pedido original (que sumaba `contacted`). Si contactada siguiera sumando, marcar una alerta
    como contactada no bajaría el badge, lo cual contradice el criterio de aceptación pedido
    ("marcar contactada → baja el badge"). El resumen de Inicio (`dashboard/page.tsx`, Bloque B) sí
    sigue sumando `active + contacted` a propósito — ahí se busca una foto general de "cuántas
    alertas abiertas hay", no un contador de pendientes-sin-tocar.
  - **Gotcha real de Next.js App Router encontrado probando en vivo**: un layout compartido NO se
    vuelve a pedir al server con una navegación normal por `<Link>` entre páginas del mismo layout
    (Next.js reusa el render ya hecho del layout) — solo se refresca con: (a) una navegación dura
    (recargar / poner la URL de nuevo), o (b) cualquier `router.refresh()` disparado desde un
    Client Component (todas las acciones de alertas ya lo hacen). Se confirmó en vivo: crear una
    alerta nueva y navegar con el sidebar a "Inicio" dejaba el badge desactualizado hasta la
    próxima acción o recarga dura; "Marcar contactada" sí lo actualiza al toque porque
    `contactar-button.tsx` llama `router.refresh()`. **No es un bug para arreglar** — es como
    funciona el App Router, aceptado como límite de MVP (igual que no tener cron para el motor).
- Sidebar (`components/dashboard/sidebar-nav.tsx`): "Configuración" dejó de ser un link directo a
  `/configuracion/retencion` (ya no tiene un único destino con 2 sub-páginas) — ahora es un
  encabezado de sección sin link propio, con "Retención" y "Mensajes" indentados debajo. Sin
  toggle de expandir/colapsar (siempre visible) — más simple, y con 2 sub-items no hace falta.
- **Probado end-to-end en el browser contra datos reales** (gym "iron gym"): alumno de prueba
  "Badge Testing" (3x/sem, alta 25 días atrás) → el motor generó la alerta → badge "1" visible en
  el sidebar tras una recarga dura → "Marcar contactada" → badge desaparece sin recargar (confirma
  que `router.refresh()` sí re-renderiza el layout) → página de Mensajes: textarea con el default,
  contador de caracteres, preview en vivo actualizándose mientras se tipea → escribir un mensaje
  custom con las 3 variables → guardar → volver a Retención → el link de WhatsApp usa el mensaje
  custom con las variables ya reemplazadas (nombre completo del alumno, días reales, nombre real
  del gym) → volver a Mensajes → "Restaurar mensaje por defecto" → guardar → el link de WhatsApp
  vuelve al default. Sin errores ni warnings de consola en toda la sesión. Alumno de prueba dado
  de baja al terminar (mismo criterio que "Foto Testing"/"Alerta Testing").
  - Migración 005 (`gyms.settings jsonb`) corrida por Matías — confirmado con la columna
    funcionando (antes de correrla, el guardado tiraba `column gyms.settings does not exist`,
    esperable).

## Semana 6, Bloque A: Pagos internos — CRUD de planes + asignar membership (probado end-to-end)
Gestión 100% manual (el gym registra a mano quién pagó qué). La integración de cobros online
(Stripe/MP, para que el gym te pague la suscripción a vos) es Semana 9, no se tocó nada de eso acá.
Las tablas `plans`/`memberships`/`payments` ya existían en Supabase desde Semana 0 (con RLS ya
activa, `plans_all_same_gym`/`memberships_all_same_gym`); esta sesión no corrió ninguna migración
nueva. `payments` sigue sin usarse (es del Bloque B, historial de pagos).
- types/db.ts: `Plan`, `MembershipStatus`, `Membership`, `MembershipWithPlan` (con `plans`
  embebido), `PAYMENT_METHODS` (definido ya para el Bloque B, sin uso todavía) y `Payment`.
- lib/validations/plan.ts: `planFormSchema` (price/duration_days son strings numéricos
  requeridos, no el patrón `numericStringField` opcional de rutinas) y `assignPlanSchema`
  (`plan_id`/`start_date`).
- lib/payments.ts: `diasHastaVencimiento(endDate)` — parsea el string `"YYYY-MM-DD"` a mano
  (`split("-")` + `Date.UTC`) en vez de `new Date(endDate)`, por el mismo motivo que
  `parseFechaLocal`; compara contra "hoy" en horario de Argentina reusando
  `getDatePartsInBA()` de `lib/attendance.ts`. `calcularFechaVencimiento(startDate, durationDays)`
  usa `parseFechaLocal` + `addDays` de date-fns. `getMembershipStatus()` es la función clave:
  **no hay cron que pase una membership vencida a `status: 'expired'`** — la columna se queda en
  `'active'` para siempre salvo que se asigne un plan nuevo (ahí sí se expira, ver
  `assignPlan`). Por eso "vencido"/"vence pronto" se calculan siempre comparando fechas en el
  momento de mostrar, nunca confiando solo en la columna `status`. Umbral de "vence pronto": 7
  días o menos.
- app/(dashboard)/dashboard/configuracion/planes/: página + `actions.ts`
  (`createPlan`/`updatePlan`/`togglePlan`/`deletePlan`), mismo patrón exacto que
  `configuracion/retencion` (Semana 5 Bloque A): reglas sugeridas que insertan directo sin abrir
  el dialog (`components/planes/planes-sugeridos.tsx`, calca `reglas-sugeridas.tsx`), dialog
  inline compartido create/edit (`plan-form.tsx`), toggle optimista (`plan-toggle.tsx`, mismo
  patrón "ajustar estado durante el render" que `regla-toggle.tsx`).
  - `deletePlan` primero cuenta `memberships` con ese `plan_id` (`count: "exact", head: true`);
    si hay alguna (de cualquier `status`, no solo activa), devuelve error sugiriendo desactivar
    en vez de eliminar — probado en vivo contra un plan con una membership ya expirada, bloqueó
    el borrado correctamente.
- **Asignar/cambiar plan desde la ficha del alumno** (`components/planes/asignar-plan-dialog.tsx`
  + `assignPlan()` agregado a `app/(dashboard)/dashboard/alumnos/[id]/actions.ts`): un alumno
  tiene como máximo una membership `status = 'active'` a la vez. `assignPlan` hace, en este
  orden: 1) trae `duration_days` del plan elegido, 2) `update` de cualquier membership
  `active` del alumno a `expired`, 3) `insert` de la nueva con `end_date` calculado
  (`calcularFechaVencimiento` + `format(..., "yyyy-MM-dd")`). El Select de plan usa el mismo
  sentinel `""` (no `undefined`) documentado en el gotcha de Bloque A de retención para arrancar
  vacío sin warning de Base UI de "uncontrolled to controlled".
  - Header de la ficha del alumno (`PlanInfo` en `alumnos/[id]/page.tsx`): si no hay membership
    activa muestra "Sin plan asignado" + botón "Asignar plan"; si hay, muestra
    `{plan.name} · Badge de estado (color por `getMembershipStatusColor`) · Vence el {fecha}` +
    botón "Cambiar plan" (mismo componente `AsignarPlanDialog`, solo cambia el label). La query
    del alumno ahora trae en paralelo la membership activa (`*, plans(*)`, `.maybeSingle()`) y
    los planes activos del gym (para el Select del dialog).
  - **Verificación de la idempotencia de "una sola activa" sin acceso directo a Supabase Table
    Editor en esta sesión** (no había sesión iniciada en el dashboard de Supabase del browser):
    se confía en que `.maybeSingle()` sobre `status = 'active'` lanza error si encuentra más de
    una fila — como el segundo cambio de plan (de "3 veces por semana" a "Plan Trimestral")
    renderizó limpio sin error, es evidencia indirecta fuerte de que la membership anterior sí
    quedó `expired`. Si hace falta confirmarlo de forma directa en una sesión futura, loguearse
    en el Table Editor y chequear la tabla `memberships` del alumno de prueba.
  - Sidebar: se sumó "Planes" a `configSubItems` en `components/dashboard/sidebar-nav.tsx`
    (tercer sub-item bajo "Configuración", junto a Retención y Mensajes).
- **Probado end-to-end en el browser contra datos reales** (gym "Setteria"): estado vacío de
  Planes → crear el plan sugerido "3 veces por semana" ($15.000/30 días) → crear uno personalizado
  a mano "Plan Trimestral" ($40.000/90 días) → desactivar y reactivar con el toggle → en la ficha
  de "Matias islas" (sin plan) → "Asignar plan" → elegir "3 veces por semana", fecha de inicio hoy
  (24/08/2026, precargada) → header muestra "3 veces por semana · Al día · Vence el 23/09/2026"
  (30 días exactos, cálculo correcto) → "Cambiar plan" a "Plan Trimestral" → header actualiza a
  "Plan Trimestral · Al día · Vence el 22/11/2026" (90 días exactos) → intentar eliminar "3 veces
  por semana" (que ya tiene memberships asociadas) → toast de error sugiriendo desactivar en vez
  de eliminar, tal como se pidió. Sin errores ni warnings de consola. No se probaron en vivo los
  estados "vence pronto"/"vencido" (necesitarían una fecha de vencimiento pasada o próxima, no
  se manipuló la fecha del sistema ni se editó `end_date` a mano en la DB) — la lógica de
  `getMembershipStatus` está cubierta por `tsc`/`eslint` pero no por una prueba visual de esos
  dos estados; si aparece algo raro con esos badges, revisar `lib/payments.ts` primero.
  - El alumno de prueba usado fue el real "Matias islas" (no uno descartable como "Foto
    Testing") — quedó con "Plan Trimestral" asignado (membership real, no se revirtió). Avisado
    en el resumen de esta sesión, no se dio de baja nada.
