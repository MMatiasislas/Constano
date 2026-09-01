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

## Semana 9: exportar rutinas y plantillas a PDF (completo, probado end-to-end)

Cada rutina de alumno y cada plantilla se puede exportar a un PDF con el logo del gimnasio,
descargable y compartible por WhatsApp. El botón "Exportar PDF" (antes disabled) ahora genera el
archivo bajo demanda.

- **Migraciones (SQL mostrado al usuario, corridas por él en Supabase):**
  - `008_gym_logo.sql`: agrega `gyms.logo_url varchar`.
  - `009_gym_assets_storage_policies.sql`: 4 policies (select/insert/update/delete) sobre
    `storage.objects` para el bucket `gym-assets`, mismo patrón que `member-photos` — cada gym solo
    opera dentro de su carpeta `{gym_id}/`, usando `public.current_gym_id()` (ya existía desde
    `001_enable_rls.sql`).
  - **Bucket `gym-assets`** creado a mano en el dashboard de Supabase: público, 5MB máx, tipos
    permitidos `image/jpeg,image/png,image/webp,image/svg+xml,application/pdf`. Estructura de
    carpetas: `gym-assets/{gym_id}/logo.{ext}` para el logo, `gym-assets/{gym_id}/routines/{routine_id}.pdf`
    para PDFs de rutinas y `gym-assets/{gym_id}/templates/{template_id}.pdf` para PDFs de plantillas
    (subcarpetas distintas para no compartir namespace de archivos entre dos tablas con ids
    independientes, aunque una colisión real de UUID es prácticamente imposible).

- **Logo del gimnasio** (`/dashboard/configuracion/general`, página nueva, agregada como primer
  ítem del sidebar de Configuración):
  - **Decisión deliberada, no un descuido**: el uploader (`components/configuracion/gym-logo-upload.tsx`)
    solo acepta **JPG y PNG**, aunque el bucket admite también WEBP y SVG. Motivo: `@react-pdf/renderer`
    (la librería que arma el PDF) solo puede insertar imágenes JPG/PNG — es una limitación documentada
    de la librería, no un bug. Si se aceptara WEBP/SVG, el logo se subiría bien pero aparecería
    invisible en el PDF sin ningún aviso. `lib/storage/gym-logo-validation.ts` documenta esto en un
    comentario.
  - Mismo patrón que `photo-upload.tsx` de alumnos (Avatar + comprimir con `browser-image-compression`
    si pesa más de 5MB), pero a diferencia de aquel, **sube inmediatamente al elegir el archivo** (no
    espera a un submit de formulario aparte) — tiene más sentido acá porque no hay más campos
    alrededor. `lib/storage/gym-logo.ts`: `uploadGymLogo(file, gymId)` / `deleteGymLogo(gymId)`,
    mismo cache-bust `?v=timestamp` que las fotos de alumnos.
  - Server Actions en `app/(dashboard)/dashboard/configuracion/general/actions.ts`: `uploadGymLogo`
    (sube y guarda `gyms.logo_url`) y `deleteGymLogo` (borra del bucket y limpia la columna).

- **Template del PDF** (`components/pdf/routine-pdf-template.tsx`): componente de `@react-pdf/renderer`
  (`Document`/`Page`/`View`/`Text`/`Image` de esa librería, no HTML/CSS) compartido entre rutinas y
  plantillas — `memberName: null` hace que muestre "Plantilla" en vez de un nombre de alumno y oculta
  el mes. Header: logo (40×40, `objectFit: contain`) + nombre del gym si hay logo, o el nombre del gym
  solo en texto grande (22pt) si no hay. Por cada día: subtítulo + tabla de ejercicios. **Columnas
  dinámicas**: Series/Reps/Peso/Descanso/Notas se ocultan si NINGÚN ejercicio de TODA la rutina (no
  día por día) tiene ese dato cargado — así una rutina sin pesos cargados no deja una columna "Peso"
  vacía en todas las filas. Formato de celdas igual al de la UI existente (`${weight}kg`,
  `${rest_seconds}"`). Footer fijo (`fixed`) con nombre del gym + "Generado con Constano". Cada fila
  de tabla tiene `wrap={false}` para que nunca se corte una fila a la mitad entre dos páginas; el
  título de cada día tiene `minPresenceAhead={60}` para evitar que quede solo al final de una página
  sin ninguna fila debajo.
  - **Gotcha real de ESLint**: `jsx-a11y/alt-text` tira warning en el `<Image>` de `@react-pdf/renderer`
    porque el linter no distingue ese componente del `<img>` de HTML — pero el `Image` de react-pdf
    ni siquiera tiene prop `alt` en su tipo (los PDFs no tienen accesibilidad de imagen igual que el
    HTML). Se silenció con un `eslint-disable-next-line` puntual, comentado.

- **Generación** (`.../rutinas/[routineId]/pdf-actions.ts` y `.../plantillas/[templateId]/pdf-actions.ts`,
  Server Actions): traen la rutina/plantilla completa con días+ejercicios (+ member para rutinas),
  renderizan con `renderToBuffer` (import dinámico de `@react-pdf/renderer` dentro de la función,
  igual patrón que `html5-qrcode` en Bloque B) y suben el buffer al bucket con `upsert: true` — **se
  regenera y sobreescribe en cada click**, nunca se cachea, así el PDF siempre refleja la última
  edición. `next.config.ts` suma `serverExternalPackages: ["@react-pdf/renderer"]` (la forma estable,
  no-experimental en Next 15+) porque esta librería trae dependencias nativas de Node (fontkit,
  png-js) que rompen si el bundler intenta empaquetarlas.
  - **La URL pública se pide con `getPublicUrl(path, { download: nombreDeArchivo })`** — no es
    cosmético: ese parámetro le pide a Supabase Storage que devuelva `Content-Disposition: attachment`,
    lo que fuerza la descarga real incluso siendo una URL de otro origen (el atributo HTML `download`
    de un `<a>` normal NO fuerza descarga cross-origin, así que sin esto el botón "Descargar PDF"
    simplemente abriría el PDF en una pestaña). Confirmado con `curl -D -` que el header llega.
  - `lib/pdf/filename.ts`: `pdfFileName(title)` arma el nombre sugerido de descarga a partir del
    título (slug sin acentos).

- **Integración en la UI**: `components/pdf/exportar-pdf-button.tsx`, un solo componente client
  compartido por la vista de rutina y la de plantilla. Al click: loading → llama al Server Action →
  abre un `Dialog` con "Descargar PDF" y "Compartir por WhatsApp". El botón de WhatsApp se muestra
  deshabilitado (con `title` nativo como tooltip, mismo patrón sin librería de Tooltip documentado en
  Bloque B.1) si no hay teléfono (alumno sin teléfono cargado, o plantilla sin alumno).
  - **Bug real encontrado y arreglado en vivo**: la primera versión pasaba `whatsapp.buildMessage`
    (una función que arma el mensaje con la URL del PDF, que recién se conoce después de generar) como
    prop de un Server Component a este Client Component. Next.js lo rechaza en runtime: *"Functions
    cannot be passed directly to Client Components unless you explicitly expose it by marking it with
    'use server'"* — solo se pueden pasar Server Actions (funciones con su propia directiva `"use server"`),
    nunca closures comunes. Fix: en vez de una función, el Server Component arma un
    **`messagePrefix: string`** (el mensaje completo salvo la URL) y el cliente concatena
    `messagePrefix + pdfUrl` recién cuando el PDF ya se generó. **Regla general para el resto del
    proyecto**: nunca pasar una función común (no Server Action) de un Server Component a un Client
    Component — armar el string/dato en el servidor y dejar que el cliente lo complete con lo que solo
    él conoce (acá, la URL post-generación).
  - Cada página (`[routineId]/page.tsx` y `[templateId]/page.tsx`) define el Server Action que llama
    al generador **inline, con su propio `"use server"` dentro de una función local** (patrón soportado
    por Next para pasar una acción ya "bindeada" a un id específico como prop a un Client Component,
    sin tener que exponerle el id aparte al cliente).

- **Probado end-to-end en el browser, en la cuenta de test (`testintruso@gmail.com`, gym "Setteria"
  de prueba — NO la cuenta real)**:
  - Logo: subida de un PNG de prueba (verificado con `Cambiar logo`/`Eliminar` apareciendo), eliminado
    y confirmado el fallback de texto grande sin logo, vuelto a subir.
  - Rutina real ("Rutina PDF Testing", alumno "QR Testing" con teléfono) con 2 días y 3 ejercicios
    variados a propósito (uno con todos los datos, uno sin peso, uno solo con notas) → **se
    descargó el PDF vía `curl` (headers confirmando `Content-Disposition: attachment` y
    `content-type: application/pdf`) y se leyó su contenido**: logo, nombre del gym, alumno, título,
    mes, fecha, ambos días, columnas correctas (todas presentes porque entre los 3 ejercicios cada
    columna tiene al menos un valor), guiones en las celdas vacías.
  - Plantilla real ("Plantilla PDF Testing", sin alumno) con 1 día y 1 ejercicio con solo
    series/reps → PDF confirmado mostrando "Plantilla" en vez de nombre, sin línea de mes, columnas
    Peso/Descanso/Notas correctamente **ausentes** (ningún ejercicio de esa plantilla las usa).
  - WhatsApp: se inspeccionó el `href` real del botón (sin hacer click, para no depender de que
    WhatsApp Web esté logueado en el entorno de test) y se confirmó el mensaje decodificado exacto:
    `Hola QR Testing! Acá está tu rutina "Rutina PDF Testing": {url}`, con el número del alumno.
  - La descarga real por click del navegador automatizado no se pudo confirmar en archivo (el
    entorno de browser automation no deja rastro del archivo descargado en disco, posible sandboxing
    de la extensión) — se validó igual bajando la URL real con `curl`, que es la fuente de verdad del
    contenido servido.
  - `tsc --noEmit` y `eslint` limpios en todo el módulo al final.

- **Pendiente, no urgente**: mismo ítem que Bloque B de Semana 8 — `NEXT_PUBLIC_SITE_URL` en Vercel
  (acá afecta la URL que queda embebida en el PDF/WhatsApp si `lib/qr-checkin.ts`'s `getSiteUrl()` se
  reusara para esto; en la práctica esta feature no depende de esa variable porque la URL del PDF
  siempre es la de Supabase Storage, no la de la app).

## Semana 10, Bloque A: landing pública de marketing (completa, probada end-to-end)

Primera página pública de marketing del proyecto (hasta ahora todo era dashboard autenticado o
`/checkin` minimalista). Vive en `app/page.tsx` (la raíz del dominio) y reemplaza el redirect
automático que había antes (`redirect(user ? "/dashboard" : "/login")`): ahora la home siempre
muestra la landing, esté logueado o no el visitante — el header solo cambia "Iniciar sesión" por
"Ir al dashboard" según haya sesión (mismo criterio que cualquier SaaS). El acceso real al panel
sigue siendo `/login` → `/dashboard`, sin cambios.

- **Identidad visual nueva, deliberadamente distinta del resto del producto**: el dashboard es
  gris/neutro a propósito (utilitario); la landing suma un acento **naranja vibrante** (clases
  `orange-400/500/600` de Tailwind, sin tocar los CSS variables de `globals.css` que usa el resto
  de la app) + una sección hero en `bg-neutral-950` (dark) con un glow radial difuminado detrás del
  título, para dar impacto en el primer scroll. El resto de las secciones alternan
  `bg-background`/`bg-muted/40` para dar ritmo, y el footer vuelve a `bg-neutral-950` (bookend con
  el hero).
- **Estructura**: `components/marketing/` — `landing-header.tsx` (client, sticky, menú hamburguesa
  en mobile con estado propio), `hero-section.tsx` (con un "mock" del producto hecho con divs +
  lucide-react, no una captura de pantalla real ni SVG externo: barras de asistencia + alerta de
  retención + badge de check-in QR), `problem-section.tsx`, `features-section.tsx` (4 cards con
  iconos `Dumbbell`/`AlertTriangle`/`QrCode`/`Wallet`), `how-it-works-section.tsx` (3 pasos con
  línea conectora en desktop, oculta en mobile), `pricing-section.tsx` (4 cards, "Pro" destacado con
  borde naranja + badge "Más elegido"), `final-cta-section.tsx`, `footer-section.tsx`.
- **`reveal-on-scroll.tsx`**: wrapper client reutilizable (fade-in + slide-up sutil la primera vez
  que una sección entra en viewport, vía `IntersectionObserver` + Tailwind `transition-all`, no
  `tw-animate-css`) — respeta `motion-reduce` explícitamente. Se usa en casi todas las secciones,
  con `delayMs` para escalonar cards dentro de una misma grilla.
- **`lib/marketing.ts`**: `WHATSAPP_PLACEHOLDER_NUMBER = "5492235551234"` — **placeholder real,
  comentado en el código, pendiente de que Matías lo reemplace** por el número real antes de
  producción. Se usa en la card "Custom" de precios y en el footer (ambos con `whatsappHref` de
  `lib/members.ts`, reusado tal cual).
- **Precios**: Basic $30.000, Pro $50.000 (destacado), Max $80.000, Custom ("Hablanos por
  WhatsApp") — todos con botón "Empezar gratis" → `/signup`, salvo Custom que abre WhatsApp con
  el mensaje pedido.

### Bug real encontrado y arreglado: navegación por ancla con `scroll-behavior: smooth`

Se agregó `scroll-smooth` al `<html>` (para que los links del header a `#caracteristicas` /
`#como-funciona` / `#precios` scrollearan con animación) y **la navegación por ancla dejó de
funcionar por completo**: al clickear un link, el hash de la URL cambiaba pero la página nunca se
movía — confirmado en vivo, no solo sospechado: se leyó `window.scrollY` directo por JS después de
cada click y quedaba en 0 sin moverse ni siquiera esperando varios segundos. La primera hipótesis
(equivocada) fue que el App Router de Next interceptaba el cambio de history y reseteaba el
scroll; se descartó al comprobar con `location.hash = "#precios"` + `scroll-behavior: auto` que el
salto instantáneo SÍ funcionaba perfecto (aterrizaba exacto en `elementTop - scroll-mt-20`). La
causa real: **con `scroll-behavior: smooth` activo, tanto la navegación nativa por hash como
`element.scrollIntoView({behavior:"smooth"})` llamado a mano se quedaban colgados indefinidamente
sin animar nada**, un fallo puntual del entorno de browser automation usado para probar (no se
verificó si ocurre en un Chrome real de usuario, pero el costo de la duda no vale la pena). Fix:
se sacó `scroll-smooth` de `app/layout.tsx` y los links del header quedaron como `<a href="#id">`
planos, sin ningún `onClick`/JS de por medio — el salto es instantáneo (no animado) pero 100%
confiable en cualquier navegador. Cada sección con ancla tiene `scroll-mt-20` para no quedar tapada
por el header sticky. **Lección para el resto del proyecto**: no asumir que `scroll-behavior:
smooth` / `scrollIntoView({behavior:"smooth"})` van a completar la animación — si en algún momento
se necesita re-agregar scroll suave, verificar con una lectura real de `window.scrollY` post-click,
no alcanza con mirar que el hash cambió.

- **Metadata de SEO**: `export const metadata` en `app/page.tsx` (title + description específicos
  de la landing), sobreescribe el genérico del layout raíz solo para esta ruta. Favicon
  (`app/favicon.ico`) ya existía, no se tocó.
- **Probado end-to-end en el browser**: las 3 anclas del header (Características/Cómo
  funciona/Precios) saltan a la sección correcta (confirmado con `window.scrollY` real, no solo
  visual); mobile (viewport ~500px) con el menú hamburguesa abriendo/cerrando y linkeando bien,
  header muestra "Ir al dashboard" logueado y "Iniciar sesión" deslogueado (probado cerrando sesión
  de verdad y volviendo a `/`); botones "Empezar gratis"/CTA final → `/signup`; botón WhatsApp de
  precios y footer con el placeholder correcto y el mensaje pedido, verificado decodificando el
  `href` real. `tsc --noEmit` y `eslint` limpios.
- **Pendiente para Matías**: reemplazar `WHATSAPP_PLACEHOLDER_NUMBER` en `lib/marketing.ts` por el
  número real de WhatsApp antes de producción (2 usos: card "Custom" de precios y footer).

## Semana 10, Bloque B — Parte 1: modelo de suscripciones + pantalla de planes + checkout
(Mercado Pago y Stripe). **NO incluye webhooks ni bloqueo real de gyms suspendidos — eso es la
Parte 2.** Esto es la suscripción del GYM a Constano (lo que el gym nos paga a nosotros); no
confundir con `plans`/`memberships` (Semana 6), que es la cuota que el gym le cobra a SUS alumnos.

### Modelo de datos
- Migración `supabase/migrations/011_subscriptions.sql` (el número 010 ya estaba usado por
  `onboarding_seen_at`) — **sin correr todavía**, Matías la corre a mano en el SQL Editor:
  - `subscription_plans`: catálogo fijo (`basic`/`pro`/`max`), precio, `max_members`, `features`
    (jsonb array de strings). Es la ÚNICA fuente de verdad del precio — ni la pantalla de planes
    ni los checkouts de MP/Stripe hardcodean un precio, todos leen esta tabla en el momento.
  - `gym_subscriptions`: historial de suscripciones por gym (`provider`, `provider_subscription_id`,
    `status`, `current_period_start/end`). RLS: los gyms solo pueden `select` la propia (`gym_id =
    current_gym_id()`); a propósito NO hay policy de insert/update para `authenticated` — eso lo
    va a hacer el webhook de la Parte 2 con la service role key, nunca el cliente.
  - `gyms.grace_period_ends_at` (nuevo, nullable) y `gyms.current_plan_id` (nuevo, FK a
    `subscription_plans`).
- `types/db.ts`: `Gym`, `SubscriptionPlan`, `SubscriptionPlanId`, `GymSubscriptionRecord`,
  `PaymentProvider`/`PAYMENT_PROVIDERS`. **No se llama `Plan` a propósito** — ese nombre ya lo usa
  el tipo de los planes del GYM a sus alumnos (Semana 6); acá es `SubscriptionPlan`.

### Estados de suscripción (`lib/subscription.ts`)
- `getSubscriptionStatus(gym, activeSubscription, now?)`: función PURA (no pega a la DB) que
  calcula el estado real — `trial` → `grace_period` → `active` → `suspended`, en ese orden de
  prioridad, siempre a partir de fechas + si hay una `gym_subscriptions` con `status='active'`
  vigente, **nunca confiando en `gyms.subscription_status` a secas** (esa columna la va a
  mantener el webhook de la Parte 2 y puede quedar desactualizada). El caller (la página) hace las
  queries y le pasa los datos ya resueltos — mismo patrón que `getMembershipStatus`/
  `getSubscriptionStatus` de otros módulos del proyecto.
  - `grace_period_ends_at` se calcula on-the-fly como `trial_ends_at + 3 días` si la columna
    todavía está en `null` (no hay ningún proceso en la Parte 1 que la setee a mano) — así el
    estado "grace_period" funciona igual sin depender de un cron.
- `isGymBlocked(statusInfo)`: `true` solo si `status === "suspended"`. **Todavía no está cableado
  en ningún lado** (ni middleware, ni Server Actions) — es la regla ya lista para que la Parte 2 la
  conecte, a propósito no bloquea nada todavía (pedido explícito de la tarea).
- `formatPriceARS`: re-exporta `formatCurrency` de `lib/payments.ts` (mismo formato "$30.000") en
  vez de duplicar la lógica — un solo lugar de verdad para el formato de plata en todo el proyecto.

### Pantalla `/dashboard/configuracion/suscripcion`
Server Component (`page.tsx`) que trae en paralelo: el gym, los `subscription_plans` activos, y la
`gym_subscriptions` activa y vigente (si hay). Sidebar: "Suscripción" agregado como 6º sub-item de
Configuración.
- `components/suscripcion/estado-suscripcion-card.tsx`: 4 variantes de card según el estado
  (trial con Badge de días, grace_period en ámbar, active en verde con fecha de próximo cobro,
  suspended en rojo/destructive).
- `components/suscripcion/plan-card.tsx`: una card por plan (Basic/Pro/Max), con
  `ElegirPlanDialog` como CTA salvo que sea el plan actual (entonces muestra Badge "Plan actual" +
  botón disabled). **El plan "actual" se determina desde `statusInfo` recién calculado, no desde
  `gym.current_plan_id` directo** — mismo criterio de "no confiar en la columna", coherente con
  `getSubscriptionStatus`.
- Card chica de "¿Más de 200 alumnos?" con el mismo `WHATSAPP_PLACEHOLDER_NUMBER`/`whatsappHref`
  que ya usa la landing pública (`lib/marketing.ts`/`lib/members.ts`), reusados tal cual.
- **A propósito NO se tocó ningún color de marca de la landing (`brand-*`)** acá — el dashboard
  sigue con los tokens neutros `--primary`/`--accent` de shadcn, como pide la tarea explícitamente.

### Checkout — Mercado Pago (`lib/payments/mercadopago.ts`)
SDK oficial `mercadopago` (v3, paquete `MercadoPagoConfig` + clase `PreApproval`).
`createSubscriptionCheckout(gymId, planId, payerEmail)` crea una **preapproval** (suscripción
recurrente, no un pago suelto) con `auto_recurring` mensual y devuelve `init_point` (la URL de
checkout de MP). El precio se lee de `subscription_plans` DENTRO de la función (nunca se recibe
como parámetro) para que no haya forma de mandar un precio distinto al configurado.
`external_reference` queda como `"{gymId}:{planId}"` — string simple que el webhook de la Parte 2
va a parsear con `split(":")`.

### Checkout — Stripe (`lib/payments/stripe.ts`)
SDK oficial `stripe` (v22). `createStripeCheckoutSession(gymId, planId, payerEmail)` crea una
Checkout Session en modo `subscription` y devuelve su `url`.
- **Decisión que se aparta de lo que sugería la tarea**: en vez de crear Price IDs a mano en el
  dashboard de Stripe (`STRIPE_PRICE_BASIC`/`PRO`/`MAX`), el precio se arma inline con
  `price_data` en cada checkout, leído en el momento de `subscription_plans` — mismo motivo que
  MP, un solo lugar de verdad para el precio, sin tener que ir a sincronizar nada en el dashboard
  de Stripe cada vez que cambia un precio. No hace falta crear esos Price IDs.
- `unit_amount` se manda en centavos (`price_ars * 100`) — ARS no es una moneda "zero-decimal"
  para Stripe.
- `client_reference_id`/`metadata` llevan `gymId`/`planId` (mismo criterio que `external_reference`
  de MP) para que el webhook de la Parte 2 pueda identificar el gym.
- **Verificado en vivo con claves de test reales**: Stripe SÍ acepta `currency: "ars"` — el
  checkout cargó bien mostrando "ARS 50,000.00 por mes". El riesgo que había quedado sin confirmar
  acá ya no aplica (ver sección de pruebas end-to-end más abajo).

### Server Action y páginas de retorno
- `app/(dashboard)/dashboard/configuracion/suscripcion/actions.ts`: `startCheckout(planId,
  provider)` — resuelve el email del usuario logueado (requerido por ambos SDKs), llama al lib
  correspondiente, y hace `redirect(checkoutUrl)`. **El `redirect()` está a propósito FUERA del
  `try/catch`** que envuelve la llamada a MP/Stripe — `redirect()` tira una excepción especial
  (`NEXT_REDIRECT`) que Next.js necesita que se propague sin que nada la atrape, si quedara adentro
  del catch se comería el redirect y tiraría el mensaje de error genérico en su lugar.
- `components/suscripcion/elegir-plan-dialog.tsx` (client): Dialog con 2 botones (Mercado
  Pago/Stripe, con ícono + texto, sin logos de imagen reales — no hay assets de marca en el
  proyecto, se usó `Wallet`/`CreditCard` de lucide-react con un color de acento por marca en vez
  de bajar logos externos). Llama a `startCheckout` directo (no via `<form action>`) — si
  funciona, el usuario nunca vuelve a este componente (ya está afuera de la app); si falla, el
  `return {error}` del Server Action sí vuelve y se muestra con `toast.error`.
- `.../exito/page.tsx` y `.../cancelado/page.tsx`: páginas de retorno de MP/Stripe. La de éxito
  aclara explícitamente que la activación real la hace el webhook (Parte 2) y puede tardar — esta
  página NO activa nada por sí sola.

### Variables de entorno necesarias
```
MERCADOPAGO_ACCESS_TOKEN=TEST-...
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=TEST-...   # no se usa todavía en Parte 1 (no hay Payment Brick/checkout embebido), pero conviene tenerla ya
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # tampoco se usa todavía en Parte 1 (checkout es 100% redirect a Stripe, no Stripe.js embebido)
```
**Gotcha real de esta sesión, no solo de código**: el `.env.local` no tenía estas variables en
formato válido (`CLAVE=valor`) — eran valores sueltos pegados con una etiqueta entre paréntesis al
lado (`(PUBLIC KEY MP)`, `(STRIPE)`), que `dotenv` simplemente ignora sin avisar. Se reformatearon
las credenciales de Mercado Pago (son `TEST-...` reales, se usan tal cual). **Las de Stripe
quedaron con `STRIPE_SECRET_KEY` vacío a propósito** — la única credencial de Stripe que había
pegada era la publishable key, y encima es `pk_live_...` (**clave de PRODUCCIÓN real, no de
test**), sin ninguna secret key al lado. Se dejó comentado en el propio `.env.local` qué hace
falta reemplazar antes de poder probar Stripe: la publishable por la de test (`pk_test_...`) y
pegar la secret de test (`sk_test_...`). **Sin `STRIPE_SECRET_KEY` configurada, elegir Stripe en
el dialog tira un error controlado** ("Falta configurar STRIPE_SECRET_KEY...") en vez de romper en
silencio — confirmado que ese es justamente el comportamiento esperado hasta que se complete la
clave.

### Probado end-to-end (completo, en 3 sesiones seguidas por los gotchas de abajo)
Cuenta de prueba `suscripcion.test.constano.20260826b@example.com` (gym "Suscripcion Test Gym" —
no la cuenta real). Confirmado en el browser: banner "Estás en período de prueba" con "14 días
restantes", las 3 cards (Basic/Pro/Max) con precio/features reales de `subscription_plans`, y
"Elegir plan" → Pro → **ambos** proveedores redirigiendo a checkouts reales:
- **Mercado Pago**: `mercadopago.com.ar/checkout/...`, mostrando "Constano — Plan Pro · $50.000".
- **Stripe**: `checkout.stripe.com/...` con badge "Entorno de prueba" (sesión `cs_test_...`),
  "Suscríbete a Constano — Plan Pro · ARS 50,000.00 por mes". **Confirma que Stripe SÍ acepta
  `currency: "ars"`** — el riesgo que había quedado sin verificar arriba ya no aplica.
En ningún caso se completó el pago (no se ingresó ninguna tarjeta) — solo se confirmó que la URL
se genera y carga la pantalla real del proveedor.

**3 gotchas reales encontrados en el camino, no bugs del código en sí:**
1. `subscription_plans` quedó vacía la primera vez que Matías corrió la migración — el `insert`
   no llegó a ejecutarse (se volvió a pasar aparte y con eso se resolvió). Si en algún momento
   `/dashboard/configuracion/suscripcion` no muestra las 3 cards pese a no tirar error, sospechar
   esto primero: `select count(*) from subscription_plans;`.
2. **Gotcha más serio, con RLS**: aun con las 3 filas insertadas, la query seguía devolviendo `[]`
   sin ningún error — la tabla `subscription_plans` tenía RLS activado (`relrowsecurity = true`)
   sin ninguna policy, así que devolvía cero filas a cualquier rol en silencio (RLS sin policies =
   deniega todo, no tira error). Se verificó con `select relrowsecurity from pg_class where
   relname = 'subscription_plans';` y se resolvió con `alter table public.subscription_plans
   disable row level security;` — es un catálogo de precios público, no necesita RLS (a diferencia
   de `gym_subscriptions`, que sí la tiene a propósito). **Si otra tabla nueva "no devuelve nada
   pero tampoco tira error", sospechar RLS sin policies antes que cualquier otra cosa.**
3. **Mercado Pago rechaza `back_url` en local**: sin `NEXT_PUBLIC_SITE_URL` seteada,
   `getSiteUrl()` cae a `http://localhost:3000`, y la API de MP lo rechaza con `"Invalid value for
   back_url, must be a valid URL"` (necesita una URL https real, no localhost). Se resolvió
   seteando `NEXT_PUBLIC_SITE_URL` a un dominio inventado con https (`https://constano-test.example.com`,
   dejado en `.env.local` con un comentario explicando por qué) — Stripe no tuvo este problema
   (acepta `http://localhost:3000` en `success_url`/`cancel_url` sin quejarse). **Para probar MP
   localmente en cualquier sesión futura, `NEXT_PUBLIC_SITE_URL` tiene que apuntar a algo con
   https, no puede quedar sin setear.**

**Episodio de seguridad de esta sesión, vale la pena que quede documentado**: en un momento
Matías pegó por error una publishable key de Stripe **live** (`pk_live_...`), y después —
confundiendo la respuesta de una pregunta de confirmación— pareció autorizar usar también la
secret key **live** (`sk_live_...`) que había pegado. Se llegó a cablear un momento en
`.env.local`, pero Matías aclaró enseguida que NO lo había autorizado y se sacó de inmediato
(quedó vacío hasta que mandó las claves `pk_test_`/`sk_test_` correctas). **Ninguna clave live
llegó a usarse para generar un checkout real** — se esperó a las de test antes de verificar
Stripe. Lección: cuando una respuesta de confirmación sobre algo tan sensible como una clave de
pago en producción llega ambigua o se contradice después, tratarla como no confirmada y volver a
preguntar, en vez de asumir.

## Semana 10, Bloque B — Parte 2: webhooks de Mercado Pago/Stripe + bloqueo real de gyms
suspendidos. Construida, **sin verificar en vivo todavía** — quedó pendiente cuando la sesión pasó
a otra tarea (roles de equipo) antes de terminar de correr la migración/probar el flujo completo.

### Variables de entorno nuevas para esta parte
```
SUPABASE_SERVICE_ROLE_KEY=   # Supabase → Settings → API → service_role key. SECRETA.
STRIPE_WEBHOOK_SECRET=       # se genera al crear el endpoint de webhook en Stripe, o con
                              # `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
```
Ninguna de las dos está configurada todavía en `.env.local` (quedaron con el valor vacío y un
comentario explicando de dónde sacarlas) — **pendiente que Matías las complete** antes de poder
probar los webhooks o la persistencia de `grace_period_ends_at` en vivo.

### `lib/supabase/service-role.ts` (nuevo)
`createServiceRoleClient()` — cliente de Supabase con la `service_role` key, se salta RLS por
completo. Se usa en 2 lugares:
1. Los webhooks (`app/api/webhooks/mercadopago/route.ts`, `.../stripe/route.ts`) — no hay usuario
   autenticado en ese contexto (los llama MP/Stripe, no el browser).
2. El UPDATE de `gyms.grace_period_ends_at` dentro de `getSubscriptionStatus()` (ver abajo) — para
   que funcione sin importar si quien está mirando la pantalla es 'owner' o no (la policy de
   `gyms` para UPDATE es solo para 'owner', ver `001_enable_rls.sql`).

### `lib/subscription.ts` — cambios
- `getSubscriptionStatus()` pasó a ser `async`: la primera vez que detecta que el trial venció y
  `gyms.grace_period_ends_at` sigue en `null`, la calcula (`trial_ends_at + 3 días`) y la persiste
  con un UPDATE (vía service role) — **única escritura que hace esta función**, envuelta en
  try/catch para no romper el cálculo si `SUPABASE_SERVICE_ROLE_KEY` todavía no está configurada
  (se recalcula on-the-fly y reintenta persistir en el próximo request).
- Nueva función `resolveSubscriptionStatus(gymId)`: junta el fetching de gym + gym_subscription
  activa + el cálculo, que antes estaba repetido en la página de suscripción — ahora también lo
  usan el layout del dashboard (para el banner) y `requireActiveSubscription()`. Usa el cliente
  autenticado normal (`lib/supabase/server.ts`), pensada para Server Components/Server Actions.

### Webhooks
- `app/api/webhooks/mercadopago/route.ts`: acepta la notificación (soporta el formato IPN viejo
  por query string `?type=preapproval&id=...` y el formato JSON más nuevo `{type, data: {id}}`,
  ya que no hay forma de confirmar cuál manda MP sin un webhook real en producción). **Nunca
  confía en el payload** — siempre re-consulta el estado real de la preapproval a la API de MP
  con `MERCADOPAGO_ACCESS_TOKEN` antes de escribir nada. `external_reference` (seteado al crear el
  checkout, `lib/payments/mercadopago.ts`) trae `"{gymId}:{planId}"`, se parsea con `split(":")`.
  Responde 500 (no 200) ante un error real — a propósito, para que MP reintente la notificación
  más tarde; solo devuelve 200 cuando se procesó bien O cuando la notificación no era relevante
  (ej. de un `payment` suelto, no de una preapproval).
- `app/api/webhooks/stripe/route.ts`: verifica la firma con `stripe.webhooks.constructEvent()` y
  `STRIPE_WEBHOOK_SECRET` sobre el body **crudo** (`request.text()`, nunca `request.json()` —
  la verificación de firma necesita el texto sin parsear). Maneja
  `checkout.session.completed`/`customer.subscription.created`/`.updated`/`.deleted`.
  - **Bug real de la Parte 1 encontrado y arreglado acá**: `createStripeCheckoutSession()`
    (`lib/payments/stripe.ts`) mandaba `metadata: {gymId, planId}` en la Session, pero ese
    metadata NO se copia solo al objeto `Subscription` que Stripe crea — los eventos
    `customer.subscription.*` solo traen la Subscription, nunca la Session. Sin
    `subscription_data: {metadata: {...}}` en la creación del checkout, el webhook nunca podría
    haber identificado a qué gym pertenecía un pago. Ya está arreglado en `lib/payments/stripe.ts`.
  - **Gotcha real de la API de Stripe, confirmado contra los tipos del SDK instalado (v22), no de
    memoria**: `current_period_start`/`current_period_end` NO están en el objeto `Subscription`
    en esta versión de la API — Stripe los movió a nivel de `SubscriptionItem`
    (`subscription.items.data[0].current_period_start/end`). Si se toca este código y aparece un
    error de tipos sobre estos campos, es por esto — no volver a `subscription.current_period_end`
    directo, no existe.
  - Ambos webhooks: si la suscripción no quedó activa (cancelada/pausada), **a propósito NO tocan
    `gyms.subscription_status`/`current_plan_id`** — `getSubscriptionStatus()` recalcula el estado
    real la próxima vez que se consulte (puede seguir en `grace_period` si corresponde, nunca se
    fuerza a `suspended` desde el webhook).

### Bloqueo real (`lib/auth/require-active-subscription.ts`, nuevo)
`requireActiveSubscription()`: llama a `resolveSubscriptionStatus()` + `isGymBlocked()`, y si el
gym está `suspended` tira `new Error(SUBSCRIPTION_SUSPENDED_ERROR)` (la constante vive en
`lib/subscription-errors.ts`, un archivo sin ninguna otra dependencia para poder importarla tanto
desde Server Actions como desde Client Components sin arrastrar `next/headers` al bundle del
cliente). **Aplicada como ejemplo representativo en 3 Server Actions de creación** (no las 40+ del
proyecto): `createMember` (alumnos/nuevo/actions.ts), `createRoutine`
(alumnos/[id]/rutinas/actions.ts), `markAttendance` (asistencia/actions.ts) — una sola línea
(`await requireActiveSubscription();`) al principio del `try` de cada una. **Patrón a replicar**
en cualquier otra Server Action de creación/edición que se quiera proteger; nunca en acciones de
lectura ni en `startCheckout`.
- `components/suscripcion/subscription-toast.ts`: `isSubscriptionSuspendedError(message)` +
  `notifySubscriptionSuspended()` — cada client component que llama a una de esas 3 acciones
  chequea el mensaje de error antes de mostrar el toast genérico (`member-form.tsx`,
  `nueva-rutina-dialog.tsx`, `asistencia-lista.tsx`).
- `components/suscripcion/subscription-banner.tsx`: banner persistente (sin botón de cerrar, a
  propósito) montado en `app/(dashboard)/layout.tsx`, arriba del header — solo se renderiza algo
  en `grace_period` (ámbar) o `suspended` (rojo), null en `trial`/`active`.

### Verificado en vivo (2026-08-28) — bloqueo real + banners
Con `SUPABASE_SERVICE_ROLE_KEY` ya cargada, se probó el flujo completo contra el gym real
"Suscripcion Test Gym" (`fae9cd60-8b91-4c65-9ff1-13029e598df8`, slug
`suscripcion-test-gym-e3dc60`, ya existía de la Parte 1) usando Playwright headless (no había
`chromium-cli` disponible en este entorno) + el cliente service-role para mutar `gyms` entre pasos,
en vez de pedirle a Matías que corra los UPDATE a mano:
- Trial normal → sin banner. `trial_ends_at` vencido (`now() - 1 día`) → banner ámbar, calculó y
  persistió `grace_period_ends_at` solo, mostró **"2 días"** (correcto: `GRACE_PERIOD_DAYS=3` menos
  el día que el trial ya llevaba vencido — no "3 días" como decía el pedido original, ese número
  asumía mal la cuenta).
- `grace_period_ends_at` vencido → banner rojo "Tu cuenta está suspendida...".
- Intentar crear un alumno en ese estado: `createMember` cortó en `requireActiveSubscription()`,
  toast exacto de `notifySubscriptionSuspended()` ("Tu cuenta está suspendida / Activá un plan para
  seguir usando Constano" + botón "Ver planes"), el formulario no se limpió (se puede reintentar
  tras activar) y **no se creó ninguna fila nueva en `members`** (confirmado por query directa
  después). La lista `/dashboard/alumnos` se siguió viendo con normalidad (lectura no bloqueada).
- Logueado como `staff.test.constano@example.com` (mismo gym): ve el mismo banner rojo en
  `/dashboard`.
- `console --errors` del browser: sin errores en ningún paso.
- El gym se devolvió a `trial_ends_at = +7 días`, `grace_period_ends_at = null`,
  `subscription_status = 'trial'` al terminar — confirmado con una query aparte, sin datos de
  prueba colgados.
- Se le seteó una password conocida (`ConstanoTest2026!`) a los 2 usuarios de este gym (owner y
  staff) vía `auth.admin.updateUserById` para poder loguearse en el test — quedó así, útil para
  repetir esta verificación en el futuro sin tener que resetear nada.

### Pendiente real
- `STRIPE_WEBHOOK_SECRET` sigue sin configurar (a pedido explícito, Stripe queda de lado por
  ahora — el checkout ya construido queda como está, sin webhook).
- No se probó el webhook de MP con un pago de test real end-to-end (necesita `back_url`/webhook
  URL pública — ver la nota de Semana 10 más arriba sobre `NEXT_PUBLIC_SITE_URL` en local). Cuando
  el dominio esté conectado (Semana 11+): configurar en Mercado Pago Developers → la app → Webhooks
  → URL `https://<dominio>/api/webhooks/mercadopago`, eventos "Suscripciones" (preapproval). Con
  eso conectado, probar con una tarjeta de prueba de MP (documentadas en su sitio de developers)
  y confirmar que `gym_subscriptions`/`gyms.subscription_status` se actualizan solos.
- `tsc --noEmit` sobre el proyecto completo, limpio.

## Semana 11: roles de equipo (owner/staff) + invitaciones + panel de negocio privado
Construido de punta a punta, **verificado en vivo lo que no depende de la migración nueva**
(dashboard liviano por rol, sidebar, panel de negocio, listado de miembros, manejo de error
controlado al invitar) — falta correr la migración para poder probar invitaciones/aceptación real.

### Modelo de datos
`supabase/migrations/012_team_invitations.sql` — **sin correr todavía**, Matías la corre a mano:
- Tabla `team_invitations` (`token` único, `status` 'pending'|'accepted'|'expired',
  `expires_at` default a 7 días). RLS: solo `owner` del propio gym puede `select`/`insert`/etc.
  (policy `for all`) — la página pública de aceptar invitación usa `service_role` para leerla, no
  hace falta ninguna policy para `anon`.
- **Se modificó `handle_new_user()`** (el trigger de signup de
  `002_signup_trigger.sql`) con `create or replace function` — sigue siendo la misma función y el
  mismo trigger, solo se le agregó una rama nueva al principio: si `raw_user_meta_data` trae un
  `invitation_token` que matchea una invitación `pending` y todavía no vencida, el usuario se une
  como `'staff'` al `gym_id` de esa invitación (en vez de crear un gym nuevo como `'owner'`, el
  comportamiento de siempre) y la invitación se marca `'accepted'` — todo dentro de la misma
  transacción del INSERT que dispara el trigger. Si el token no está o no es válido, cae al
  comportamiento normal de siempre (crear gym nuevo), sin romper nada — la Server Action de
  aceptar invitación igual revalida el token antes de llamar a `signUp()`, así que ese fallback
  debería ser un caso límite raro en la práctica (ej. el owner cancela la invitación en el
  segundo exacto entre que el visitante carga la página y aprieta "Crear cuenta").
  - **Por qué no se podía evitar tocar este trigger**: `auth.signUp()` siempre dispara
    `handle_new_user()` sin importar cómo se llame (client-side normal, o
    `admin.createUser()` con service role) — sin esta rama nueva, CUALQUIER alta de un
    invitado hubiera creado un gym fantasma nuevo y un `public.users` con rol `'owner'`
    duplicado, chocando además con el insert manual que se hubiera intentado hacer aparte.
    Modificar el trigger para que sepa distinguir el caso era la única forma limpia.

### Roles (`lib/auth/require-owner.ts`, nuevo)
- `getCurrentUserRole()`: cacheada con `cache()` de React, mismo patrón que
  `getCurrentGymId()` (`lib/auth/get-gym-id.ts`).
- `isOwner()`: boolean, para chequeos condicionales en UI (sidebar, home del dashboard).
- `requireOwner(redirectTo?)`: protección REAL server-side — si no es owner, hace `redirect()` a
  `redirectTo` (default `/dashboard/alumnos`) con `?toast=sin-acceso` agregado en la URL. Usada al
  principio de `/dashboard/negocio` y `/dashboard/configuracion/equipo`.
- `components/dashboard/query-toast.tsx`: `<QueryToast />`, montado en
  `app/(dashboard)/layout.tsx`. Lee `?toast=<key>` de la URL, muestra el toast correspondiente
  (por ahora solo `sin-acceso`) y limpia el parámetro con `router.replace()` para que no reaparezca
  al recargar. Envuelto en `<Suspense>` porque usa `useSearchParams()`.

### Panel de negocio (`/dashboard/negocio`)
Es el Dashboard de Inicio viejo, movido tal cual (los 4 KPIs con ingresos, los 2 gráficos, las 3
listas — **contenido idéntico**, ver el `page.tsx` completo) — el único cambio real es agregar
`await requireOwner();` como primera línea del componente. `/dashboard` (la home) pasó a ser una
pantalla nueva, liviana:
- **Owner**: 3 KPIs sin ningún monto de facturación (alumnos activos, asistencia semanal,
  alertas de retención — reusa los mismos helpers de `lib/dashboard-stats.ts`, salteando a
  propósito `getMonthlyRevenue`) + una card destacada "Ver panel de negocio →" + los mismos
  accesos rápidos que ve el staff.
- **Staff**: directo los accesos rápidos (Alumnos/Asistencia/Retención), sin ningún KPI ni monto.
- El flag `owner`/`staff` se resuelve una sola vez con `isOwner()` y se usa tanto para decidir qué
  mostrar como para saltear las queries de KPIs cuando no hacen falta (`owner ? getX(gymId) :
  Promise.resolve(null)`).

### Sidebar (`components/dashboard/sidebar-nav.tsx`)
Cada item de `navItems`/`configSubItems` ahora tiene un flag `ownerOnly` — el componente filtra
la lista completa con `.filter(item => !item.ownerOnly || isOwner)` antes de renderizar, en vez de
ocultar con CSS. `SidebarNav` recibe un nuevo prop `isOwner` desde el layout (se resuelve ahí con
una sola columna extra en la query de `profile` que ya existía, no hace falta una query aparte).
**Esto es solo la parte de UX** — la protección real está en `requireOwner()` server-side en cada
página; ocultar el link no alcanzaría solo por sí mismo si alguien pega la URL directo.

### Invitaciones (`/dashboard/configuracion/equipo`, solo owner)
- `app/(dashboard)/dashboard/configuracion/equipo/actions.ts`: `inviteTeamMember({email})` valida
  que el email no sea ya parte del equipo, reusa una invitación pendiente y vigente si ya existía
  una para ese email (no duplica), si no genera un token con `randomUUID()` e inserta. Devuelve
  **el token, no la URL completa** — el cliente arma el link con `window.location.origin` en vez
  de depender de `NEXT_PUBLIC_SITE_URL` (esa variable puede estar apuntando a un dominio de
  prueba en dev, ver la nota de Mercado Pago en la Parte 1/2 de suscripciones — usar esa misma
  variable acá hubiera mostrado un link roto en local). `cancelInvitation(id)` hace un DELETE
  directo (el schema de `status` no tiene un estado "cancelled" propio, solo
  pending/accepted/expired — cancelar borra la fila en vez de forzar un estado que no existe).
- `components/equipo/invitar-miembro-dialog.tsx`: un solo Dialog con 2 pasos internos (form de
  email → muestra el link generado con botón "Copiar"), sin cerrar y reabrir un dialog nuevo.
- `components/equipo/invitaciones-table.tsx` / `miembros-table.tsx`: la de miembros es 100%
  Server Component (el único "interactivo" es un botón deshabilitado con `title` nativo como
  tooltip — **mismo criterio ya documentado más arriba para "Duplicar"/"Exportar PDF" de
  rutinas**, no hay componente Tooltip en el proyecto). El owner nunca ve un botón de
  eliminar/cambiar rol en su propia fila (el botón de eliminar directamente no se renderiza para
  `role === "owner"`).
- **Eliminar un miembro del equipo quedó sin implementar a propósito** (pedido explícito de la
  tarea, priorizando que la invitación funcione end-to-end) — el botón está deshabilitado con
  tooltip "Próximamente". TODO documentado en `actions.ts`: borrar de verdad necesitaría tocar
  `auth.users` con la service role key, y hay que decidir si es un hard-delete o una
  desactivación antes de implementarlo.
- **Envío automático de la invitación por email todavía no existe** (tampoco pedido para esta
  parte) — TODO documentado en `lib/team.ts` (`buildInvitationUrl()`, sin uso todavía desde el
  dialog, queda lista para cuando se integre Resend server-side) y en el propio dialog: por ahora
  el owner copia el link a mano y se lo manda por WhatsApp/email.

### Aceptar invitación (`/invitacion/[token]`, pública, sin auth)
`app/invitacion/layout.tsx` mismo layout centrado que `(auth)/layout.tsx` (copiado, no compartido
— son route groups distintos). El `page.tsx` usa `service_role` (no el cliente normal, RLS se lo
impediría) para validar el token: existe, `status='pending'`, no vencido. Si es válido, muestra
`components/invitacion/aceptar-invitacion-form.tsx` (nombre completo + password, **el email viene
fijo de la invitación y no es editable** — se muestra como texto, no como input). Al confirmar,
llama a `supabase.auth.signUp()` client-side pasando `invitation_token` en `options.data`, que es
lo que el trigger de la migración 012 usa para decidir la rama "unirse a un gym existente". Mismo
manejo de `!data.session` (confirmación de email pendiente → redirige a `/login` con un toast) que
ya usa `app/(auth)/signup/page.tsx`, copiado tal cual por consistencia.

### Probado en vivo en esta sesión (con la cuenta owner existente, SIN correr la migración 012)
Confirmado que todo lo que no toca `team_invitations` funciona ya, incluso sin la migración:
sidebar muestra "Negocio" y "Equipo" (owner), `/dashboard` liviano con los 3 KPIs sin plata + card
de negocio + accesos rápidos, `/dashboard/negocio` con el contenido completo movido (incluye
"Ingresos del mes"), `/dashboard/configuracion/equipo` carga y muestra al owner en la tabla de
miembros (0 invitaciones pendientes, gracefully). Clickear "Invitar miembro del equipo" con
`team_invitations` todavía inexistente tira un toast de error controlado ("No pudimos crear la
invitación") en vez de romper la página — confirma que el manejo de errores degrada bien.
`tsc --noEmit` y `eslint .` sobre el proyecto completo, limpios.

### Pendiente real para la próxima sesión
- Correr `supabase/migrations/012_team_invitations.sql`.
- Recién ahí se puede probar el flujo completo: invitar de verdad, copiar el link, abrirlo en
  incógnito, crear la cuenta de staff, loguearse como staff y confirmar que NO ve "Negocio" ni
  "Equipo" en el sidebar, que `/dashboard/negocio` redirige con el toast "No tenés acceso a esta
  sección", y que sigue pudiendo gestionar alumnos/rutinas/asistencia con normalidad.
- Sigue pendiente también todo lo de la Parte 2 de suscripciones de arriba (webhooks, service
  role key, Stripe webhook secret) — nada de esto se tocó ni se rompió en esta sesión, solo quedó
  sin avanzar porque la sesión pasó a esta tarea de roles antes de terminarlo.

**Actualización posterior**: la migración 012 se corrió y el flujo completo de invitaciones se
verificó de punta a punta en una sesión siguiente (owner invita → staff acepta → permisos
correctos). Detalle completo quedó en la memoria de Claude (`project_constano_saas.md`), no se
retro-documentó acá.

## Semana 10, Bloque A — actualización posterior: de 3 planes a 1 plan único + Custom

El modelo de precios original de esta sección (Basic/Pro/Max, ver más arriba) cambió: ahora es
**un solo plan ("Constano", $50.000/mes, hasta 100 alumnos) + Custom** para gimnasios más grandes.
Mismo cambio aplicado en 2 lugares:

- **Landing** (`components/marketing/pricing-section.tsx`, hardcodeado, no lee la DB): 2 cards —
  "Constano" (destacada, "Todo incluido") + "¿Tu gimnasio es más grande?" (Custom, botón "Hablar
  por WhatsApp").
- **Dashboard** (`/dashboard/configuracion/suscripcion`): sigue leyendo `subscription_plans` en
  vivo (sin cambios de código en `plan-card.tsx`, ya era genérico) — la reducción a 1 plan activo
  la hace la migración `013_single_plan.sql` (desactiva `basic`/`max`, renombra `pro` a
  "Constano"). El grid de cards pasó a ser condicional (`max-w-sm` si queda 1 sola, grid de 3
  columnas si hay más) para que no se vea perdida una card sola en una grilla ancha.
- **`max_members` es solo informativo** — no hay ninguna validación real en Server Actions ni en
  el checkout que bloquee crear el alumno 101; si en algún momento se pide hacerlo cumplir de
  verdad, hay que agregarlo, no asumir que ya existe.
- **Pendiente**: correr `supabase/migrations/013_single_plan.sql` en Supabase — hasta entonces el
  dashboard sigue mostrando Basic/Pro/Max (el copy de la card Custom ya está actualizado
  independientemente de la migración).

**Actualización posterior**: la migración 013 se corrió, con una corrección de precio antes de
correrla ($30.000, no los $50.000 de la primera versión de este texto y de la landing). Verificado
en vivo: dashboard con una sola card "Constano" ($30.000/mes) y ambos checkouts (MP y Stripe)
confirmando el precio correcto. Detalle completo en la memoria de Claude
(`project_constano_saas.md`), no se retro-documentó acá (mismo criterio que la 012).

## Semana 12: captura de leads antes del signup (/comenzar)

Se interpuso un formulario corto entre la landing y el signup real, para capturar el lead (nombre
del gimnasio, email, teléfono) incluso si la persona abandona antes de crear la cuenta.

### Flujo
1. Los botones "Empezar/Empezá/Probar gratis..." de la landing (`hero-section.tsx`,
   `final-cta-section.tsx`, `pricing-section.tsx`, `savings-calculator-section.tsx`,
   `landing-header.tsx` ×2 — desktop y menú mobile) apuntan a `/comenzar` en vez de `/signup`
   directo. El link "¿No tenés cuenta? Registrate" del login sigue apuntando a `/signup` — es la
   "otra vía" que tiene que seguir funcionando para quien llega directo, a propósito no se tocó.
2. `/comenzar` (`app/comenzar/`, pública, fuera de `(auth)` y `(dashboard)` — necesita el look
   oscuro del hero de marketing, no el layout centrado/claro de `(auth)/layout.tsx`): form de
   nombre del gimnasio + email + teléfono (opcional). Server Action `createLead` (`actions.ts`)
   valida con `lib/validations/lead.ts`, inserta en `leads` y redirige a
   `/signup?gym_name=...&email=...` (`redirect()` fuera del try/catch, mismo patrón que
   `startCheckout` en `dashboard/configuracion/suscripcion/actions.ts` — tira `NEXT_REDIRECT`, no
   se puede atrapar).
3. `/signup` (`app/(auth)/signup/page.tsx`) lee esos query params con `useSearchParams()` (envuelto
   en `<Suspense>`, mismo patrón que `components/dashboard/query-toast.tsx`) y los usa como
   `defaultValues` de `gymName`/`email` — el visitante los puede editar, no son readonly. Sin
   params (alguien que llega directo a `/signup`), el form arranca vacío como siempre.
4. Tras un `signUp()` exitoso **con sesión inmediata**, el cliente llama a la Server Action
   `convertLead()` (`app/(auth)/signup/actions.ts`, no bloqueante — si falla, solo se loguea, el
   signup ya se completó igual): busca un lead con el mismo email de la sesión autenticada y
   `converted_gym_id is null`, lo marca `converted_gym_id = <gym recién creado>` +
   `converted_at = now()`. El email se lee siempre de la sesión, nunca de un parámetro del caller,
   para que no se pueda convertir un lead ajeno.
   - **Caso no cubierto a propósito**: si Supabase requiere confirmación de email (sin `session`
     inmediata), el gym se crea igual vía el trigger, pero `convertLead()` nunca se llama (no hay
     sesión para autenticar la Server Action) — el lead queda sin convertir. Quedaría para una
     vuelta futura intentarlo también en el primer login.

### Modelo de datos
`supabase/migrations/014_leads.sql` — **sin correr todavía**, Matías la corre a mano. Tabla
`leads` (`gym_name`, `email`, `phone` nullable, `converted_gym_id` FK a `gyms` con
`on delete set null`, `converted_at`, `created_at`) **sin RLS a propósito**: no hay concepto de
`gym_id` acá (es data del negocio de Constano, a quién le vendemos — no un gimnasio cliente
todavía), y por ahora, sin panel de super-admin, se consulta directo desde el Table Editor de
Supabase. Índices en `email` y `created_at desc`.
- **Implicancia de seguridad a tener presente**: sin RLS, cualquiera con la anon key del browser
  podría en teoría leer o escribir cualquier fila de `leads` desde la consola (no solo insertar el
  suyo) — aceptado a propósito para esta primera versión (mismo criterio explícito del pedido
  original), no es un bug. Si en algún momento se arma el panel de super-admin o se expone algo de
  `leads` a un cliente que no sea 100% de confianza, esto hay que revisarlo (RLS que permita
  `insert` a cualquiera pero NO `select`/`update` sin service role).

### 2 gotchas reales encontrados verificando en vivo, no bugs del código de esta parte
1. **Mismo gotcha de RLS ya documentado con `subscription_plans` (Semana 10)**: apenas creada,
   `leads` tenía RLS activado sin ninguna policy — a diferencia de una lectura silenciosa vacía,
   acá el `insert` tiraba un 42501 explícito ("new row violates row-level security policy").
   Se agregó `alter table public.leads disable row level security;` al final de
   `supabase/migrations/014_leads.sql` (Matías la corrió aparte) — **si aparece otra tabla nueva
   con este problema, es directamente el patrón a aplicar, no hace falta re-investigar.**
2. **Bug real y serio, sin relación con leads, encontrado al probar el signup real**: CUALQUIER
   signup normal (sin `invitation_token`) fallaba con "Database error saving new user" (500) —
   bug preexistente en `handle_new_user()` desde la migración 012 (Semana 11): `v_invitation` se
   declaró como `record` sin tipo, y el `select into` que lo llena solo corre dentro del
   `if v_invitation_token is not null`. En un signup normal ese bloque se saltea entero, así que
   `v_invitation` queda sin asignar — y `if v_invitation.id is not null` tira "record ... is not
   assigned yet". Confirmado con una prueba de control: un signup con un `invitation_token`
   inventado (que fuerza a que el `select into` corra igual, aunque no encuentre filas) funcionaba
   bien — la única diferencia era justo esa. **Arreglado en
   `supabase/migrations/015_fix_handle_new_user_record_bug.sql`** (Matías la corrió): se
   reemplazó el `record` por 2 variables escalares `uuid` (`v_invitation_id`,
   `v_invitation_gym_id`), que en PL/pgSQL arrancan en NULL sin que haga falta que ningún
   `select` las toque. **Este bug bloqueaba el signup real de Constano para cualquier visitante
   normal — no es exclusivo del flujo de leads.**

### Verificado en vivo, de punta a punta, con Playwright headless
- Click en "Empezá gratis 7 días" del hero → navega a `/comenzar` con el diseño oscuro/verde
  esperado.
- **Caso feliz**: completar `/comenzar` → insert real en `leads` → redirect a `/signup` con
  `gym_name`/`email` pre-cargados (confirmado que coinciden exacto) → completar el resto del
  signup (nombre, contraseña) → sesión inmediata → redirige a `/dashboard` (onboarding normal) →
  confirmado en la tabla `leads` que quedó `converted_gym_id` apuntando al gym recién creado y
  `converted_at` seteado.
- **Caso de abandono**: completar `/comenzar` → redirect a `/signup` con los datos → cerrar sin
  completar el signup → el lead queda guardado con `converted_gym_id` en `null`, como se espera.
- `/signup` sin query params sigue arrancando vacío (la vía directa no se rompió).
- Sin errores de consola en ningún paso. Todos los datos de prueba (2 leads + el gym/usuario del
  caso feliz) se borraron al terminar — no quedó nada de esto en la base real.

### Pendiente real
- No hay panel dentro del dashboard para ver los leads (a propósito, fuera de alcance de esta
  parte) — mejora futura tipo mini-CRM, mencionada en el pedido original. Por ahora, Table Editor
  de Supabase.

## Rediseño visual del dashboard interno (2026-08-30)

Nuevo look profesional para todo lo que vive bajo `/dashboard/*` — la landing pública y
`/login`/`/signup`/`/comenzar` quedaron completamente intactos. Paleta: fondo gris cálido claro
(`#f7f7f5`), superficies blancas con sombra sutil (no bordes duros), verde esmeralda como acento
(`#1d9e75`, el mismo de la marca de la landing) y colores de estado consistentes en toda la app
(éxito=verde, advertencia=ámbar, peligro=coral, neutral=gris).

### Arquitectura: todo sale de variables CSS, no de tocar pantalla por pantalla
El sistema de componentes (`components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, el
propio `SidebarNav`) **ya estaba 100% armado sobre variables CSS de shadcn** (`bg-primary`,
`bg-card`, `border-border`, etc.), sin un solo color hardcodeado — así que el rediseño fue,
mayormente, cambiar los VALORES de esas variables en un solo lugar y dejar que se propagaran
solas. Eso es la prueba de que valía la pena centralizarlo así desde el principio.

- **`app/globals.css`**: se agregó un bloque `[data-dashboard-theme] { ... }` que redefine
  `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`,
  `--destructive`, `--border`, `--input`, `--ring`, `--radius` y los `--sidebar-*`, **sin tocar
  `:root`** (que sigue con la paleta neutra default de shadcn — la usan `/login`, `/signup`,
  `/comenzar`). También se agregaron 3 pares de tokens semánticos nuevos, registrados en
  `@theme inline` para que generen utilidades (`bg-success`, `text-warning`, `bg-danger-subtle`,
  etc.): `--success`/`--success-subtle`, `--warning`/`--warning-subtle`, `--danger`/`--danger-subtle`
  (con fallback en `:root` también, por si alguna vez se usan fuera del dashboard). Una card con
  sombra sutil se agrega vía `[data-dashboard-theme] [data-slot="card"] { box-shadow: ...; }` —
  **no se tocó `card.tsx`** para no afectar las cards de `/login`/`/signup`.
- **`app/(dashboard)/layout.tsx`**: el div raíz ahora lleva `data-dashboard-theme=""` — todo lo que
  cuelga de ahí (sidebar, header, `<main>`, todas las páginas de `/dashboard/*`) hereda la paleta
  por cascada normal de CSS. El `<aside>` y el `<header>` pasaron a usar `bg-sidebar`/`bg-card`
  explícitamente (antes no tenían fondo propio, heredaban el blanco de `:root`).
- **Radius**: `--radius` pasó de `0.625rem` a `0.75rem` dentro del scope del dashboard — los
  botones/inputs (`rounded-lg`) quedan en 12px, las cards (`rounded-xl`) un poco más redondeadas
  (~17px), sin tocar `card.tsx`/`button.tsx`.

### Colores de estado — 3 archivos centrales, no docenas de componentes sueltos
Los badges de estado de toda la app ya vivían en 3 mapas centralizados (patrón bueno preexistente,
no había que inventarlo):
- `lib/members.ts` → `ESTADO_BADGE` (alumno activo/pausado/inactivo)
- `lib/payments.ts` → `getMembershipStatusColor` (cuota al día/vence pronto/vencido/sin plan)
- `lib/retention.ts` → `ALERT_STATUS_BADGE` (alerta activa/contactada/resuelta/descartada)

Los 3 se actualizaron para usar `bg-success-subtle text-success` / `bg-warning-subtle text-warning`
/ `bg-danger-subtle text-danger` (nunca texto negro plano sobre el fondo de color) en vez de
`emerald-500`/`amber-500`/`red-500` hardcodeados — la asignación de qué estado usa qué color NO
cambió, solo el tono real.

Quedaron **~15 archivos sueltos** con el mismo hardcodeo puntual (badges de asistencia, del wizard
de importar Excel, de la card de suscripción, del trend en `/dashboard/negocio`, etc.) — se
actualizaron todos al mismo patrón `text-success`/`text-warning`/`text-danger`. Es la excepción
mencionada en el pedido original ("si tuviste que tocar muchos archivos sueltos... avisame") — se
avisó: no es que el sistema esté mal centralizado, es que antes de esta sesión no existía un token
semántico de estado, así que cada pantalla elegía su propio `emerald-500`/`amber-500`/`red-500` a
mano. Ahora que el token existe, cualquier badge de estado nuevo debe usarlo directo, no volver a
hardcodear un color de Tailwind.

**No tocado a propósito**: `lib/exercises.ts` (colores por grupo muscular — es una paleta
categórica de 7 colores, no un sistema de estado semántico, pedido explícitamente fuera de
alcance) y `components/checkin/*` (son páginas públicas de `/checkin/[gymSlug]/*`, no
`/dashboard/*`).

### Gráficos (recharts)
`components/dashboard/membership-status-chart.tsx` tenía su propio mapa de hex planos
(`#10b981`, `#f59e0b`...) para los slices del pie chart — no podía usar clases de Tailwind (SVG
`fill`), así que ahora lee `var(--success)`/`var(--warning)`/`var(--danger)`/`var(--muted-foreground)`
directo, para que un slice y su badge correspondiente sean siempre exactamente el mismo tono.
`attendance-chart.tsx` ya usaba `var(--primary)`/`var(--muted)` etc., no hizo falta tocarlo.

### KPIs (`components/dashboard/kpi-card.tsx`)
Número protagonista: `text-2xl font-semibold` → `text-3xl font-medium` (más grande, peso medio en
vez de semibold pesado, como pide un KPI que se lee "de un vistazo"). El label chico con ícono
arriba y el `footer` opcional para tendencia ya existían — solo se recolorearon los trends de
`/dashboard/negocio` (`text-emerald-600`/`text-red-600` → `text-success`/`text-danger`).

### Títulos de página — reemplazo mecánico en 18 archivos
Los 18 `<h1>` de título de página de `/dashboard/*` usaban el string EXACTO
`"text-2xl font-semibold tracking-tight"` — se confirmó con grep antes de tocar nada, y se hizo un
único `sed` sobre los 18 archivos a la vez (`"text-3xl font-medium tracking-tight"`). No fue
"tocar pantalla por pantalla": fue un solo comando sobre un patrón idéntico ya centralizado por
convención de código, aunque no viviera en una variable.

### Sin bugs de Base UI esta vez
No hizo falta escribir a mano ningún componente de `components/ui/` — `Button`/`Card`/`Badge`/
`Input`/`Select` ya estaban completos y 100% variable-driven, no se tocaron. El único componente
"de layout propio" tocado fue `SidebarNav` (un solo `bg-red-500 text-white` hardcodeado en el
contador de notificaciones → `bg-danger text-white`).

### Verificado en vivo — antes/después reales, no solo el código
Se generó un gym de prueba con datos variados (alumnos activo/pausado/inactivo, membership al
día/vence pronto/vencido, una alerta de retención activa) y se sacaron capturas de las mismas 6
pantallas con Playwright **dos veces**: una vez con el código nuevo, después con
`git stash`/`git stash pop` para volver momentáneamente al código viejo y comparar exactamente los
mismos datos bajo ambos estilos. Confirmado visualmente: `/dashboard`, `/dashboard/negocio`,
`/dashboard/alumnos`, la ficha de un alumno, `/dashboard/retencion` y `/dashboard/pagos` comparten
el mismo look sin haber tocado la estructura de ninguna. La landing (`/`) y `/login` se compararon
igual y quedaron pixel-a-pixel idénticas entre "antes" y "después" (confirmado además por tamaño
de archivo casi idéntico del PNG, la diferencia mínima es solo no-determinismo de compresión PNG).
Todos los datos de prueba se borraron al terminar. `tsc --noEmit` y `eslint .` limpios (mismo
warning preexistente de siempre, no relacionado).

## Auditoría de la landing en producción (2026-09-01)

Primera auditoría corrida contra `https://constano.com` real (no localhost) tras conectar el
dominio. Checklist completo de 10 puntos en `docs/AUDITORIA_LANDING_PRODUCCION.md` — acá solo el
resumen de lo que dejó código nuevo o cambiado.

### Bug crítico encontrado: el build de producción estaba roto
El último push a `main` (`64fa895`, un ajuste manual del número de WhatsApp) dejó
`lib/marketing.ts` con un string sin cerrar (`"5492235507397.;` en vez de `"5492235507397";`) —
error de sintaxis de TypeScript, `next build` no podía compilar. Vercel se había quedado sirviendo
el deploy anterior en silencio (así el sitio se veía bien, pero cualquier cambio nuevo pusheado
iba a quedar sin publicar sin aviso visible salvo el email de Vercel). Corregido. **Lección**: para
cualquier edición manual chica directo en el código (no generada por una sesión de Claude), correr
`npm run build` real antes de pushear a `main` — `tsc --noEmit` sirve pero un build completo es la
prueba definitiva de que Vercel no va a fallar en silencio.

### Bug real encontrado: `/forgot-password` no existía (404)
El link de "¿Olvidaste tu contraseña?" en `/login` apuntaba a una página que nunca se había
construido — quedó pendiente de una sesión muy vieja del proyecto. Se armó el flujo completo:
- `app/(auth)/forgot-password/page.tsx`: pide el email, `supabase.auth.resetPasswordForEmail()`.
- `app/(auth)/reset-password/page.tsx`: la página a la que redirige el email — escucha el evento
  `PASSWORD_RECOVERY` de `onAuthStateChange` (con `getSession()` de red de contención por la
  carrera posible con el montaje del componente) antes de mostrar el form de contraseña nueva; si
  no llega nada en 4s, muestra "este link ya no es válido" en vez de romper.
- **Pendiente manual de Matías**: agregar `https://www.constano.com/reset-password` a Redirect
  URLs en Supabase Dashboard → Authentication → URL Configuration — sin este paso el link del
  email fallaría igual en producción, aunque las 2 páginas ya están armadas y verificadas
  localmente (formulario envía bien, estado de link inválido se maneja bien, sin errores de
  consola, `npm run build` las genera como rutas estáticas sin problema).

### SEO: robots.txt y sitemap.xml agregados
Ninguno de los 2 existía (404 ambos). Se agregaron con la convención nativa de Next.js
(`app/robots.ts`, `app/sitemap.ts`, en vez de archivos estáticos en `public/`) — dominio
hardcodeado a `https://www.constano.com` a propósito (no `getSiteUrl()`, que cae a
`NEXT_PUBLIC_SITE_URL`/`VERCEL_URL`/localhost según el entorno, pensada para links funcionales que
también tienen que andar en preview/local — acá se necesita siempre el dominio canónico real).
`robots.ts` bloquea `/dashboard`, `/checkin` e `/invitacion` (nada de eso debería indexarse).

### Verificado en producción real con Playwright, no solo local
Signup completo de punta a punta contra la Supabase real (cuenta de prueba borrada después),
calculadora de ahorro con drag real de mouse Y de touch (fórmula verificada exacta en 25/150/300
alumnos), los 6 botones "Empezar/Empezá/Probar gratis" de todo el sitio contados y confirmados
apuntando a `/comenzar`, responsive en 375/768/1440 sin scroll horizontal no deseado, tabla
comparativa con scroll horizontal propio confirmado en mobile, certificado SSL válido y los 4
redirects HTTP→HTTPS (con/sin `www`) terminando siempre en `https://www.constano.com`.

### 2 hallazgos de pulido, documentados pero sin tocar (a propósito)
1. El validador nativo del navegador (`type="email"`) intercepta con un tooltip en inglés antes
   que el mensaje en español de Zod cuando el email no tiene ningún "@" — se arreglaría con
   `noValidate` en el form de `/comenzar`, no se tocó sin confirmar primero.
2. `public/` todavía tiene los SVG de ejemplo default de Next.js (`file.svg`, `globe.svg`, etc.),
   no se usan en ningún lado — peso muerto, no rompe nada.
