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

## Semana 6, Bloque B: registro de pagos + "Cobrar y renovar" + panel /dashboard/pagos (completo, probado end-to-end)
Cierra el módulo de Pagos internos (gestión 100% manual, sin Stripe/MP — eso es Semana 9).
Nuevo: `lib/validations/payment.ts`, ampliaciones en `lib/payments.ts` y en
`alumnos/[id]/actions.ts`, `components/pagos/`, `app/(dashboard)/dashboard/pagos/page.tsx`
(el link del sidebar ya existía apuntando ahí desde antes, rompía por falta de página).

- **`renewMembership()` extraída como helper privado** en `alumnos/[id]/actions.ts`, compartida
  por `assignPlan` (Bloque A, "Asignar/Cambiar plan" sin pago) y `registerPaymentAndRenew`
  (Bloque B, "Cobrar y renovar"): ambas hacen exactamente lo mismo a nivel membership (expirar la
  activa si había, crear la nueva con `end_date` calculado) — la única diferencia es que
  `registerPaymentAndRenew` además inserta una fila en `payments` con
  `membership_id = la membership recién creada`. Si se toca la lógica de renovación, tocarla acá
  una sola vez.
- **`registerPaymentAndRenew` devuelve un tipo de retorno explícito**
  (`Promise<{error}|{success:true, endDate}>`) — mismo gotcha de narrowing ya documentado en
  Semana 4 (`markAttendance`): TS no infiere bien la unión cuando la rama de éxito tiene un campo
  extra. El caller (`CobrarRenovarDialog`) narrowea con `"error" in result`, no con
  `result?.error`.
- **`registerPaymentOnly`** (botón "Registrar pago sin renovar", para señas/ajustes/venta de
  productos): busca la membership `active` actual del alumno (si tiene) y la usa como
  `membership_id` del pago — puede quedar `null` si el alumno no tiene plan. No toca la tabla
  `memberships` para nada.
- **Bug real encontrado y arreglado probando en vivo**: `payments.paid_at` es `timestamptz`
  (llega de Supabase como ISO completo, ej. `"2026-08-24T00:00:00+00:00"`), **no** `date` como
  `memberships.start_date`/`end_date` — pasarlo directo a `parseFechaLocal()` (que asume
  `"YYYY-MM-DD"` y le concatena `T00:00:00`) produce un string inválido y `date-fns format()` tira
  `RangeError: Invalid time value`, rompiendo toda la página. Fix en
  `components/pagos/historial-pagos.tsx`: `parseFechaLocal(pago.paid_at.slice(0, 10))` — mismo
  patrón ya usado con `routine.created_at` en la ficha del alumno. **Si se lee `paid_at` en algún
  otro lugar del proyecto, aplicar el mismo `.slice(0, 10)` antes de `parseFechaLocal`** — no
  asumir que es un `date` plano solo porque otras columnas `_date` del proyecto sí lo son.
- `lib/payments.ts` (agregado): `formatCurrency(amount)` (formato argentino, `$15.000`, sin
  decimales, `toLocaleString("es-AR")`) y `getMethodLabel(method)` (mapa desde `PAYMENT_METHODS`).
- `lib/validations/payment.ts`: `paymentSchema` (amount > 0 requerido, method enum, paid_at
  requerido, notes opcional). El Select de método arranca con default `"efectivo"` (no con el
  sentinel `""` documentado en Bloque A de retención) porque acá sí hay un default de producto
  obviamente correcto (el método más común), así que no aplica ese gotcha.
- **`CobrarRenovarDialog`** (`components/pagos/cobrar-renovar-dialog.tsx`): recibe la
  `MembershipWithPlan` actual del alumno (no un `planId` suelto) para poder mostrar nombre/precio
  del plan en la descripción y pre-cargar el monto sugerido (`String(membership.plans.price)`,
  editable). Reusado en dos lugares con la misma firma: el tab Pagos de la ficha del alumno y cada
  fila del panel `/dashboard/pagos` — mismo componente, sin duplicar.
- **Panel `/dashboard/pagos`**: Server Component, una sola query de `members` activos + una de
  `memberships` activas (join a `plans`), cruzadas en JS con un `Map` por `member_id` (mismo
  patrón que `assignPlan` de Bloque A, no hace falta un query anidado). `getMembershipStatus` +
  `diasHastaVencimiento` (ya existían de Bloque A) se reusan tal cual para clasificar en las 4
  tabs. Tab por default: "Vencidos" si hay alguno, si no el primer bucket no vacío en el orden
  vencidos → vence pronto → al día → sin plan (spec solo pedía el primer caso, el fallback fue
  criterio propio).
- **Badge rojo de "Pagos" en el sidebar** (mismo patrón visual que el de Retención): en vez de
  duplicar la función `getMembershipStatus` en una query, `app/(dashboard)/layout.tsx` cuenta
  directo con SQL: `memberships` con `status='active'` y `end_date < hoy (Buenos Aires)`, con
  `!inner` a `members` filtrando `status='active'` — mismo patrón de `!inner` + filtro anidado que
  el contador de "presentes hoy" de Asistencia (Semana 4). `SidebarNav` ahora recibe
  `pagosVencidosCount` además de `retentionAlertCount`, y el mapeo href→contador se generalizó a
  un `Record<string, number>` en vez de un único `if` hardcodeado a Retención (para no repetir el
  mismo bloque JSX por cada badge nuevo que se sume a futuro).
- **Probado end-to-end en el browser contra datos reales** (gym "Setteria", alumno real "Matias
  islas", que venía de Bloque A con "Plan Trimestral" asignado): tab Pagos → "Cobrar y renovar"
  ($15.000 efectivo, con nota) → apareció en el historial, plan renovado a 90 días desde hoy
  (22/11/2026) → acá se encontró y arregló el bug de `paid_at` de arriba → "Registrar pago sin
  renovar" ($5.000, venta de producto) → apareció en el historial sin tocar la membership → panel
  `/dashboard/pagos`: alumno real en "Al día (1)". Se creó un alumno de prueba "Pagos Testing"
  (mismo criterio que "Foto Testing"/"Alerta Testing") para poder ver las 4 pestañas con datos:
  asignarle un plan con `start_date` en el pasado (01/07/2026, plan de 30 días) → apareció en
  "Vencidos (1)" con "Vencido hace 24 días (31/07/2026)" en rojo, y el badge "1" en el sidebar de
  Pagos → "Cobrar y renovar" desde el panel (no desde la ficha) → se movió a "Al día", badge del
  sidebar desapareció sin recargar → "Cambiar plan" con `start_date` 29/07/2026 (30 días → vence
  28/08, dentro de 7 días) → apareció en "Vencen pronto (1)" con "Vence en 4 días (28/08/2026)" en
  amarillo. Los 4 estados (vencido/vence pronto/al día/sin plan) quedaron verificados visualmente.
  Alumno de prueba dado de baja al terminar. Sin errores ni warnings de consola después del fix.
- **Nota de datos reales, no un bug de esta sesión**: al arrancar, "Matias islas" mostraba "Plan
  Trimestral" pero con fecha de vencimiento de 30 días (23/09/2026) en vez de los 90 días
  correctos (22/11/2026) que había quedado al cierre de Bloque A — no se pudo determinar la causa
  exacta (no había forma de inspeccionar `memberships` directo en Supabase Table Editor en esta
  sesión), consistente con el precedente ya documentado de actividad humana concurrente de
  Matías en el mismo browser. Al usar "Cobrar y renovar" sobre ese mismo alumno el plan volvió a
  quedar en 90 días correctos (22/11/2026), así que no bloqueó nada — solo queda como dato para
  no sorprenderse si se repite.

## Semana 7: Dashboard de Inicio con KPIs reales + gráficos (completo, probado end-to-end)
La home (`app/(dashboard)/dashboard/page.tsx`) pasa de 3 cards básicas (Alumnos/Rutinas/Alertas)
a un panel de control real. Se **eliminó** la card de Rutinas (no pedida en el nuevo diseño).
Nueva dependencia: `recharts` (`^3.10.1`), primera vez que se usa en el proyecto.

- **`lib/dashboard-stats.ts`** (nuevo, server-only): 9 helpers, cada uno recibe `gymId` explícito
  y hace su propio `createClient()` — mismo patrón que `lib/retention-alerts-engine.ts`, no
  `getCurrentGymId()` adentro de cada uno (se resuelve una sola vez en la página y se pasa).
  - `getActiveMembersCount`: cuenta activos hoy vs. activos que ya estaban dados de alta hace
    30+ días — es una **aproximación**, no un snapshot histórico real (no contempla bajas en el
    medio), documentado así a propósito porque así lo pidió la tarea.
  - `getMonthlyRevenue`/`getAttendanceLast14Days`: usan límites de mes/día en horario de
    Argentina (`getDatePartsInBA` de `lib/attendance.ts`), mismo patrón que
    `getStartOfDayISO`/`getEndOfDayISO` pero para rangos de mes y de 14 días.
  - `getMembershipStatusBreakdown`: reusa `getMembershipStatus` de `lib/payments.ts` tal cual
    (mismo criterio que el panel `/dashboard/pagos` de Semana 6) — no duplica la lógica de
    vencimiento.
  - `getOpenRetentionAlertsCount`/`getRecentRetentionAlerts`: "abiertas" = `active` + `contacted`,
    mismo criterio que ya usaba la home vieja (no el del badge del sidebar, que es solo `active`
    — la distinción entre esos dos criterios ya estaba documentada desde Semana 5 Bloque C).
  - `getUpcomingBirthdays`: compara mes/día del `birth_date` ignorando el año (parseado a mano
    con `split("-")`, no vía `parseFechaLocal`, porque acá no importa la hora ni el timezone de
    parseo, solo los componentes de fecha calendario) contra "hoy" en Buenos Aires: si el
    cumpleaños de este año ya pasó, se compara contra el del año que viene. Ventana de 30 días.
- **Gráficos son Client Components** (`components/dashboard/attendance-chart.tsx` — BarChart de
  14 días — y `components/dashboard/membership-status-chart.tsx` — dona de 4 estados), la página
  sigue siendo un Server Component que les pasa los datos ya calculados como props.
  - Colores: barra usa `var(--primary)` (se invierte solo con el tema, igual que
    botones/badges); la dona usa los mismos 4 colores que los badges de estado de cuota
    (`#10b981`/`#f59e0b`/`#ef4444`/`#9ca3af`) pero en hex fijo, no CSS vars — un slice de gráfico
    no necesita adaptarse a claro/oscuro, igual que el punto de color de un badge no lo hace.
  - Mark specs aplicados (gráficos de calidad, no placeholders): barras con esquinas superiores
    redondeadas de 4px y grosor tope 24px, gridlines hairline sólidas (nunca punteadas), tooltip
    con hover en ambos gráficos, leyenda siempre visible con los números al lado de cada color en
    la dona (nunca color solo).
  - **Bug real encontrado y arreglado probando en vivo**: la dona casi no se veía (un
    sliver/arco mínimo en vez de un círculo completo) al primer render. Causa real: el
    `ResponsiveContainer` de recharts estaba directo dentro de un contenedor `flex` sin ancho
    fijo (`sm:flex-row`) — en ese contexto puede colapsar a un ancho ~0 porque un hijo flex sin
    `flex-basis` explícito se mide por su contenido, y el `ResponsiveContainer` no tiene
    contenido intrínseco hasta que JS mide su padre (problema clásico de "recharts dentro de
    flexbox"). Fix: envolver el `ResponsiveContainer` en un `<div>` con tamaño fijo
    (`h-[200px] w-[220px] shrink-0`) antes de meterlo en el flex row. **Si se agrega otro gráfico
    de recharts dentro de un layout flex/grid, aplicar el mismo wrapper de tamaño fijo** — no
    confiar en que `width="100%"` del propio `ResponsiveContainer` alcance.
  - Un segundo momento donde pareció el mismo bug (un arco chiquito en vez de la dona completa)
    en realidad era solo la **animación de entrada** de recharts (crece desde 0° hasta el
    ángulo final en ~800ms) — un screenshot tomado inmediatamente después de cargar la página la
    agarra a mitad de camino. No es un bug, solo hay que esperar un instante antes de comparar
    visualmente un gráfico recién montado.
  - Tooltip del `BarChart`: por default mostraba un separador `": "` sobre un `name` vacío
    (`" : 1 check-ins"`, con los dos puntos sueltos) porque el `formatter` devuelve `[value, ""]`
    — se arregló con la prop `separator=""` del `Tooltip` de recharts.
- Estados vacíos manejados en cada sección de forma independiente (no toda la página junta):
  KPI de alumnos con 0 muestra "Todavía no cargaste alumnos" en vez del indicador de variación;
  el `BarChart`/dona se reemplazan por un mensaje de texto si no hay datos en el rango
  (`EmptyChartState`); las 3 listas (alertas/pagos/cumpleaños) tienen su propio texto vacío
  (`EmptyListState`).
- `components/dashboard/kpi-card.tsx`: componente compartido para las 4 cards de KPI — si
  recibe `href`, envuelve toda la card en un `<Link>` de Next (la de "Alertas de retención" es la
  única que lo usa, apunta a `/dashboard/retencion`).
- **No se pudo verificar el layout mobile con un viewport angosto real**: la herramienta de
  resize de ventana del browser de esta sesión no afectó la resolución de captura de pantalla
  (limitación del entorno, no del código). El responsive se armó con las mismas clases Tailwind
  ya usadas en el resto del proyecto (`grid-cols-2 lg:grid-cols-4`, etc.) pero no hay una
  captura mobile real de esta pantalla — si se nota algo raro en el celular, revisar ahí primero.
- **Probado end-to-end en el browser contra datos reales** (gym "Setteria"): las 4 KPI cards con
  números reales (1 alumno activo, $35.000 de ingresos del mes — suma de los 3 pagos cargados en
  Semana 6 —, 0% de asistencia semanal, 0 alertas con "Todo bajo control" en verde) → gráfico de
  asistencia en estado vacío ("Todavía no hay asistencias...") → se marcó una asistencia real
  desde `/dashboard/asistencia` para el alumno real → recargando el dashboard, la asistencia
  semanal subió a 100% y apareció una barra real en el gráfico de 14 días (con tooltip
  "24/08 · 1 check-ins" al hacer hover) → dona mostrando "Al día 1 (100%)" → las 3 listas
  (alertas/pagos/cumpleaños) con datos reales o su estado vacío correspondiente → click en un
  pago de la lista navegó correctamente al detalle del alumno. Sin errores ni warnings de
  consola en toda la sesión después de los dos fixes de arriba.

## Semana 8, Bloque A: importación masiva de alumnos desde Excel/CSV (completo, probado end-to-end)
Wizard de 4 pasos en `components/alumnos/importar-excel/` (todo Client Components, orquestados
por `importar-dialog.tsx`), botón "Importar desde Excel" al lado de "Nuevo alumno" en
`/dashboard/alumnos` (y también en el estado vacío). Nueva dependencia: **`xlsx` (SheetJS)
instalada desde el CDN propio de SheetJS, no desde npm** —
`npm install https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz`, ver gotcha de seguridad abajo.
El parseo del archivo es 100% client-side; el insert final pasa por Server Action
(`app/(dashboard)/dashboard/alumnos/importar/actions.ts`).

- **Gotcha de seguridad, no solo de código**: la versión de `xlsx` publicada en el registry de
  npm (0.18.5) tiene 2 CVEs sin parche ahí (prototype pollution, ReDoS) — SheetJS solo publica la
  versión arreglada en su propio CDN, no en npm, por una decisión de ellos. Se confirmó con
  Matías antes de instalar y se eligió el CDN. **Si en algún momento `npm install`/`npm ci` falla
  o alguien reinstala `node_modules` sin el `package.json` ya pinneado a esa URL, revisar que
  `package.json` siga apuntando a `https://cdn.sheetjs.com/xlsx-latest/xlsx-latest.tgz` y no a
  `xlsx` de npm** — instalar desde npm por error reintroduce las 2 vulnerabilidades.
- **Paso 1 (subir archivo)**: `components/alumnos/importar-excel/parse-archivo.ts`,
  `parsearArchivoExcel(file)`. **Bug real encontrado y arreglado probando en vivo**: un `.csv` en
  UTF-8 (con tildes/ñ) se leía con mojibake ("MarÃa" en vez de "María") al pasarlo como
  `ArrayBuffer` crudo con `XLSX.read(buffer, {type: "array"})` — SheetJS adivina el codepage de un
  CSV sin BOM y adivinaba mal. Fix: si el archivo es `.csv`, se lee como texto con `file.text()`
  (que decodifica UTF-8 según el spec de la Web API) y se le pasa a `XLSX.read(texto, {type:
  "string"})`, bypaseando la adivinanza de codepage por completo. Un `.xlsx`/`.xls` sí es binario
  real y sigue leyéndose con `file.arrayBuffer()` + `{type: "array"}`. **Si aparece mojibake en
  otro parseo de archivo de texto subido por el usuario en el futuro, sospechar lo mismo: revisar
  si se está pasando como buffer binario en vez de decodificar como texto explícitamente.**
- **Paso 2 (mapeo de columnas)**: `lib/validations/member-import.ts`, `detectarMapeoColumna(header)`
  — normaliza el header (`NFD` + saca diacríticos + minúsculas) y matchea contra keywords por
  campo, en el orden de `IMPORT_FIELDS`. El orden importa a propósito: `first_name` (con la
  keyword genérica `"nombre"`) se chequea antes que `last_name` (`"apellido"`), así una columna
  "Nombre y Apellido" sugiere `first_name` (combinado) en vez de `last_name`, tal como pidió el
  producto.
- **Paso 3 (preview + validación + duplicados)**: `components/alumnos/importar-excel/procesar-filas.ts`,
  función pura `procesarFilas(rows, mapping, existingMembers)`.
  - Parseo tolerante de fecha (`parseFechaImportacion`, en `lib/validations/member-import.ts`):
    prueba `dd/MM/yyyy` → `d/M/yyyy` → `MM/dd/yyyy` → `yyyy-MM-dd` → `dd-MM-yyyy` en ese orden con
    `date-fns/parse` + `isValid`; el primer formato que da una fecha válida gana. Prioriza
    dd/MM (convención argentina) pero cae a MM/dd si dd/MM da un mes imposible (ej. "08/24/2026"
    → día=08/mes=24 inválido → prueba MM/dd → mes=08/día=24 válido). Devuelve `null` si ningún
    formato calza — el campo se descarta en silencio, no hace fallar la fila (excepto
    `joined_at`, que si no se pudo parsear cae a la fecha de hoy como default).
  - Frecuencia semanal tolerante (`parseFrecuenciaImportacion`): acepta `"3"`, `"3x"`, `"5x/sem"`,
    `"libre"/"Libre"` (→ `null`, mismo sentinel que el resto de la app) — extrae el primer número
    con `/\d+/` y lo clampea a 1-6 (fuera de rango o sin número reconocible → `null`/libre, nunca
    error de fila). La frecuencia nunca bloquea una importación.
  - **Único motivo de error de fila implementado: falta el nombre.** Cualquier otro dato mal
    formado (fecha rota, email inválido) se descarta en silencio para ese campo en vez de tirar
    la fila entera — decisión de producto para maximizar cuántas filas del Excel entran, dado que
    la tarea solo pidió "falta el nombre, por ejemplo" como caso de error explícito.
  - Duplicados: se compara **nombre completo normalizado** (trim + lowercase + espacios
    colapsados) O **teléfono normalizado** (solo dígitos, mismo criterio que `whatsappHref` en
    `lib/members.ts`) contra TODOS los members del gym (activos e inactivos, no solo la página
    actual) — `getExistingMembersForImport()` en `actions.ts` trae esa lista liviana aparte del
    listado paginado normal.
- **Paso 4 (importar)**: `importMembers(rows)` en `actions.ts`. Un solo `insert(array)` para todas
  las filas "nueva" y un solo `upsert(array, {onConflict: "id"})` para todas las "duplicado →
  actualizar" — no N llamadas individuales. La validación con `memberImportRowSchema` se repite
  server-side (defensa extra, nunca confiar en los datos tal cual llegan del cliente).
  - **Defensa agregada**: si dos filas del Excel matchean al mismo alumno existente (ej. mismo
    teléfono repetido en dos filas), un `upsert` con la misma PK dos veces en el mismo array
    rompe en Postgres (`ON CONFLICT DO UPDATE command cannot affect row a second time`). Se
    deduplica por `existingId` con un `Map` antes de armar el array de upsert (gana la última
    fila) — no se llegó a probar este caso en vivo (el archivo de prueba no lo tenía), pero es un
    fix barato para un error real de Postgres, no una hipótesis.
  - Confiado en RLS para que un `existingId` no pueda pertenecer a otro gym — mismo criterio ya
    usado en `updateMemberStatus` (Semana 2): la fila queda invisible bajo `using` si es de otro
    tenant, y el upsert intentaría un insert con esa PK ya ocupada, que falla por conflicto de
    clave en vez de pisar datos ajenos.
- **Probado end-to-end en el browser contra datos reales** (gym "Setteria"): CSV de 10 filas con
  columnas de nombres distintos a los esperados ("Nombre Completo", "Tel", "Cumpleaños", "Fecha
  de Ingreso", "Frecuencia", "Notas") → auto-mapeo detectó las 6 correctamente sin tocar nada →
  preview mostró "8 nuevas · 1 duplicado · 1 con error" (fila sin nombre → "Falta el nombre"; fila
  "Matias islas" con nombre igual al alumno real → "Ya existe: Matias islas") → cambiar el
  duplicado a "Actualizar" → "Importar 9 alumnos" → resultado "Se importaron 8 alumnos nuevos. Se
  actualizaron 1. Se omitieron 1." → confirmado en el listado. Fechas mixtas dd/MM/yyyy y
  yyyy-MM-dd en el mismo archivo, ambas parseadas bien. Sin errores de consola después del fix de
  encoding.
  - **Efecto secundario real de la prueba, corregido en la misma sesión**: la fila de prueba
    "Matias islas" (deliberadamente con el mismo nombre que el alumno real, para probar la
    detección de duplicados) al marcarse "Actualizar" sobrescribió datos reales del alumno real
    "Matias islas" — teléfono, email (quedó vacío, la columna no estaba en el CSV de prueba),
    apellido (se perdió porque el CSV tenía "Nombre Completo" como un solo campo → todo cayó en
    `first_name`, `last_name` quedó `null`), fecha de nacimiento y notas. **Esto no es un bug de
    la feature — es el comportamiento esperado de "Actualizar" funcionando correctamente** (pisa
    los datos del duplicado con los del Excel, tal como pide el producto), pero confirma que
    conviene tener cuidado real al elegir "Actualizar" sobre un alumno real durante pruebas: se
    restauraron a mano los valores originales de "Matias islas" (teléfono
    `+542235507397`, email `matiasconia@gmail.com`, apellido `islas`, fecha de nacimiento y alta
    `20/08/2026`, notas `Prueba Bloque B - edición funcionando`) inmediatamente después de
    confirmarlo. Los 8 alumnos ficticios creados por la importación (Juan Pérez, María García,
    Carlos Rodríguez, Ana Martínez, Lucía Fernández, Diego Sánchez, Sofía Torres, Pablo Ramírez)
    se dieron de baja uno por uno al terminar, mismo criterio que "Foto Testing"/"Alerta Testing"

## Semana 8, Bloque B: check-in por QR (completo, probado end-to-end)
Cada alumno puede tener un QR único para marcar su propia entrada sin pasar por el mostrador.
Es, con diferencia, **la parte más sensible en seguridad de todo el proyecto**: expone rutas
públicas (`/checkin/...`, sin login) con capacidad de escritura real en la base (insertar
asistencias). Toda esa superficie se resolvió con 4 funciones Postgres `SECURITY DEFINER` — no
hay ninguna policy de RLS nueva para `anon`, a propósito.

- **Modelo**: `members.qr_token` (migración `006_member_qr_token.sql`, columna `varchar unique`
  + índice parcial). El QR codifica
  `{siteUrl}/checkin/{gymSlug}/scan?token={qr_token}` (`buildCheckinScanUrl` en
  `lib/qr-checkin.ts`). `getSiteUrl()` usa `NEXT_PUBLIC_SITE_URL` si está seteada, si no
  `VERCEL_URL`, si no `http://localhost:3000` — **falta configurar `NEXT_PUBLIC_SITE_URL` en
  Vercel** para que los QR impresos apunten al dominio real en producción; mientras tanto usan lo
  que Vercel resuelva automáticamente.
- **`generateQrToken()` vive en `alumnos/[id]/actions.ts`, no en `lib/qr-checkin.ts`** — usa
  `randomUUID`/`randomBytes` de Node (`crypto`), y `lib/qr-checkin.ts` lo importan también
  Client Components (la card de QR de la ficha del alumno, para armar la URL a codificar y el
  link de WhatsApp) — meter un import de `crypto` ahí rompería ese bundle de cliente. Token final:
  UUID v4 sin guiones + 8 bytes extra en hex (48 caracteres), no adivinable.
- **4 funciones Postgres `SECURITY DEFINER`** en `007_qr_checkin_functions.sql`, cada una
  devolviendo el mínimo indispensable (nunca la fila completa, nunca `settings` crudo con el
  PIN adentro), con `search_path = public` fijo (mismo patrón que `current_gym_id()` de
  Semana 1, evita el shadowing de esquema clásico sobre funciones `SECURITY DEFINER`) y
  `grant execute` explícito a `anon`+`authenticated` después de revocar de `public`:
  1. `get_gym_public_info(slug)` → `{id, name, has_kiosk_pin}` — nombre del gym para los headers
     públicos + si ya tiene PIN configurado (booleano, nunca el valor).
  2. `get_member_qr_info(slug, token)` → `{first_name, last_name}` — nombre del alumno para la
     página "Mi QR", validando que el token pertenezca a ESE gym.
  3. `verify_kiosk_pin(slug, pin)` → boolean — el PIN real nunca sale de la función.
  4. `checkin_by_qr_token(slug, token)` → jsonb `{status, member_name?, checked_in_at?}` — el
     check-in en sí: busca el member por token+slug combinados (nunca por separado, para no
     filtrar si un token existe en OTRO gym), exige `status = 'active'` (un alumno pausado/dado
     de baja no puede seguir marcando con un QR viejo), intenta el insert, y si salta
     `unique_violation` (el índice único de asistencia por día de Semana 4) devuelve
     `already_checked_in` con la hora ya registrada en vez de fallar — el más reciente registro
     de ese alumno es siempre el de hoy si el insert chocó, así que no hace falta reimplementar
     la lógica de límites de día acá.
  - **3 de estas 4 funciones son extra respecto a lo que pedía la tarea original** (que solo
    pedía `checkin_by_qr_token`) — hicieron falta porque las policies de RLS de `gyms`/`members`
    son `to authenticated` únicamente (Semana 1): sin ellas, ni siquiera un `select name from
    gyms` funciona para un visitante anónimo. Se explicó y se documentó la razón en el momento.
  - **Gotcha grave de esta sesión, no un bug de código**: el cache de esquema de PostgREST quedó
    desincronizado durante horas — `get_gym_public_info` sí se refrescó con un reload manual,
    pero `get_member_qr_info`/`verify_kiosk_pin`/`checkin_by_qr_token` seguían devolviendo
    `PGRST202` (función no encontrada) incluso después de reload de cache Y un restart completo
    del proyecto. La causa real, encontrada recién al pedir el resultado *textual* de
    `pg_get_function_arguments(oid)` (no solo "¿existe sí/no?"): **la traducción automática del
    navegador de Matías estaba activa en la interfaz donde leía el SQL, y tradujo `as $$` a
    `como $$`** al copiarlo — un error de sintaxis que las 2 primeras funciones (más cortas,
    quizás con menos ocurrencias de "as" en una posición que la traducción tocara) esquivaron por
    suerte, pero las otras 3 no. **Lección para cualquier sesión futura que le pida a Matías
    correr SQL a mano**: si una función "no existe" en el cache pese a reloads/restart, no asumir
    que es solo un tema de cache — pedir el resultado *literal* de una verificación en
    `pg_proc` (no un sí/no) y, si el usuario reporta que corrió el SQL "sin error" pero el
    `CREATE OR REPLACE` nunca tomó efecto, sospechar traducción automática del navegador
    corrompiendo palabras clave del SQL al copiar/pegar.
  - **Idempotencia por `checked_in_at::date` reusando el mecanismo de Bloque A de Semana 4**: no
    se reimplementó ninguna lógica de "es hoy" en la función — el índice único ya existente hace
    todo el trabajo, la función solo reacciona a la excepción.
- **Ficha del alumno**: nueva pestaña "QR" (`components/alumnos/qr-checkin/qr-checkin-card.tsx`).
  Estado vacío → "Generar código QR"; con token → imagen del QR (`components/checkin/qr-code-image.tsx`,
  genera el `data:` URL client-side con la lib `qrcode`, sin pasar por el servidor) + 3 acciones:
  - **Ver/Imprimir**: `alumnos/[id]/imprimir-qr/page.tsx` (autenticada, dentro de `(dashboard)`).
    Se agregaron clases `print:hidden` al `<aside>`/`<header>` del layout del dashboard
    (`app/(dashboard)/layout.tsx`) para que `window.print()` solo imprima la tarjeta del QR, no
    el sidebar — **regla `print:` global nueva, aplica a cualquier página futura del dashboard
    que quiera una vista imprimible**, no hace falta repetirla por página.
  - **Enviar por WhatsApp**: usa `whatsappHref` de `lib/members.ts` (mismo helper que el resto
    del proyecto) apuntando al teléfono del alumno si lo tiene cargado, con el mensaje pidiendo
    que linkea a la página "Mi QR" (`buildMiQrUrl`), no a la URL cruda del QR.
  - **Regenerar QR**: mismo `generateMemberQrToken()` que "Generar" la primera vez (solo pisa el
    token), con `AlertDialog` de confirmación.
- **`/checkin/{gymSlug}/mi-qr/{token}`**: página pública, mobile-first, `notFound()` si el gym o
  el token no matchean. Botón "Descargar imagen" con `<a download>` sobre el mismo `data:` URL
  del QR (funciona normal en el navegador real de un usuario — la restricción de descargas
  bloqueadas es específica del sandbox de Artifacts, no aplica acá).
- **`/checkin/{gymSlug}/scan`**: página pública a la que llega alguien que escanea el QR con la
  cámara de SU PROPIO celular (no el kiosco) — resuelve el check-in server-side en la carga de
  la página (llama a `scanQrCheckin` directo, sin pasar por fetch) y muestra
  `components/checkin/checkin-result-view.tsx` (mismo componente que usa el kiosco).
- **`/checkin/{gymSlug}` (kiosco)**: `components/checkin/kiosk-scanner.tsx`, Client Component con
  `html5-qrcode` (import dinámico dentro de un `useEffect`, mismo patrón que
  `browser-image-compression` en `photo-upload.tsx` — nunca top-level, evita tocar `document` en
  SSR). Usa la clase `Html5Qrcode` de bajo nivel (no el widget `Html5QrcodeScanner` con su propia
  UI) para poder controlar el diseño grande/simple pedido. Al decodificar un QR: extrae el
  `token` de la URL con `new URL(decodedText).searchParams`, pausa la cámara
  (`instance.pause(true)`), llama a `scanQrCheckin`, muestra el resultado 4 segundos
  (`setTimeout`) y llama a `instance.resume()` — nunca se hace stop/start completo entre
  escaneos, solo pausa/resume (mucho más rápido).
  - **Primera vez que un staff de ESE gym entra sin PIN configurado**: `KioskScanner` recibe
    `isStaffOfThisGym`/`hasKioskPin` como props (resueltos en el Server Component de
    `app/checkin/[gymSlug]/page.tsx`, comparando `users.gym_id` del usuario logueado —si hay—
    contra el `id` del gym resuelto por slug) y muestra
    `components/checkin/configurar-pin-primera-vez.tsx` en vez de la cámara hasta que se guarde
    un PIN — reusa el mismo `setKioskPin()` autenticado de Configuración (no hace falta una
    acción pública para ESCRIBIR el PIN, solo para leerlo/verificarlo).
  - **Botón "Salir"** (`components/checkin/salir-kiosco-dialog.tsx`): pide el PIN, llama a
    `verifyKioskPinAction` (pública), y si es válido redirige a `/dashboard/asistencia` (si había
    sesión activa en ese dispositivo) o `/login` (si no) — la decisión de a dónde mandar se
    resuelve server-side (prop `hasActiveSession`), el cliente nunca decide solo con el PIN.
  - **Sin rate limiting en el PIN a propósito**: el espacio de 10.000 combinaciones no está
    protegido — acertar el PIN solo permite salir de la pantalla de escaneo en ESE dispositivo
    físico, nunca da acceso a datos sin además un login real de staff. Threat model aceptado
    para MVP, documentado en el propio SQL de la función.
- **`app/(dashboard)/dashboard/configuracion/kiosco/`**: página de config del PIN
  (`components/configuracion/kiosco-pin-form.tsx`) + botón "Abrir modo kiosco (QR)" (`target=
  _blank` a `/checkin/{slug}`). El mismo botón se agregó también en el header de
  `/dashboard/asistencia` (pedido explícito de la tarea, para que el encargado lo abra fácil en
  la tablet). Sidebar: "Kiosco" sumado como 4º sub-item de Configuración.
- **Bug real preexistente encontrado y arreglado en el camino, no relacionado a esta feature**:
  `components/dashboard/user-menu.tsx` rompía al abrir el menú de usuario
  (`Base UI: MenuGroupContext is missing` — `DropdownMenuLabel` estaba fuera de un
  `DropdownMenuGroup`). Bloqueaba directamente poder cerrar sesión para probar con otra cuenta,
  así que se arregló envolviendo `DropdownMenuLabel` + `DropdownMenuSeparator` + el item de
  "Cerrar sesión" en un `<DropdownMenuGroup>`. No se investigó desde cuándo estaba roto.
- **Probado end-to-end en el browser en una cuenta de prueba nueva** (gym "Setteria" — mismo
  nombre que la cuenta real por decisión de Matías al crearla, pero `gym_id` distinto, 0 alumnos
  al arrancar): alumno de prueba "QR Testing" → generar QR → página "Mi QR" se ve bien en un
  viewport angosto → configurar PIN `1234` → escanear pegando el token en `/scan` (cámara real no
  es práctica de testear en este entorno) → "¡Bienvenido QR Testing! 💪 Entrada registrada a las
  17:12" → reintentar el mismo token → "Ya registraste tu entrada hoy a las 17:12 · ¡Nos vemos
  adentro!" → token inventado → "QR no reconocido" → modo kiosco: "Salir" con PIN incorrecto
  (rechazado) y correcto (redirigió a `/dashboard/asistencia`, había sesión activa) → confirmado
  ahí que "QR Testing" aparece "Presente 17:12", exactamente igual que un check-in manual. Sin
  errores de consola. Alumno de prueba dado de baja al terminar.
- **Pendiente real, no resuelto en esta sesión**: configurar `NEXT_PUBLIC_SITE_URL` en las
  variables de entorno de Vercel apuntando al dominio real de producción — sin eso, los QR
  impresos/enviados en producción codifican lo que Vercel resuelva automáticamente vía
  `VERCEL_URL`, que puede no ser el dominio final que los alumnos vean.
    en sesiones anteriores.
