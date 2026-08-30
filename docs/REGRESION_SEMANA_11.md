# Regresión funcional completa — pre-piloto (2026-08-29)

Objetivo: probar de cero, en orden, los 10 flujos más críticos de Constano para
detectar bugs silenciosos antes del piloto — el mismo tipo de problema que el
de `handle_new_user()` encontrado el día anterior (rompía el signup real sin
que nadie lo notara).

**Metodología**: cada flujo se probó de punta a punta con datos reales
(Playwright headless manejando un browser real contra `npm run dev`, nunca
solo lectura de código ni mocks), verificando además el resultado directo en
la base de datos (no solo lo que mostraba la pantalla). Se usó un gimnasio de
prueba nuevo, creado de cero vía signup real (`Regresion QA regqa1`) —
**nunca se tocaron "Setteria" ni ningún otro dato real**. Todo el gym de
prueba (alumnos, rutinas, plan, regla de retención, usuarios, archivos en
Storage) se borró al terminar; se verificó con una consulta aparte que no
quedó ningún rastro.

## Resultado en una línea

**9 de 10 flujos sin ningún hallazgo. 1 bug real de accesibilidad encontrado
y corregido en el momento** (campos de monto con el label mal asociado al
input). Ningún bug del calibre del de `handle_new_user()` — el signup y el
resto de los flujos críticos están sanos.

---

## 1. Auth — ✅ sin hallazgos
Signup nuevo (sin invitación) → dashboard con sesión inmediata. Logout →
`/login`. Acceder a `/dashboard` sin sesión → redirige a `/login`
correctamente. Login con las credenciales recién creadas → dashboard. El fix
de ayer en `handle_new_user()` se sostiene: el signup normal funciona sin el
error "Database error saving new user".

## 2. Onboarding — ✅ sin hallazgos
El dialog aparece en el primer ingreso tras el signup. Click en "Ir a
Alumnos" (paso 1) navega y cierra el dialog. Recargando `/dashboard` después,
no vuelve a aparecer solo — `onboarding_seen_at` quedó bien seteado en la DB.

## 3. Alumnos — ✅ sin hallazgos
- Alta manual + subida de foto (bucket `member-photos`) en el mismo formulario: `photo_url` quedó bien seteado.
- Edición: cambio de apellido persistido.
- Pausar → `status='paused'` en DB → Reactivar → `status='active'`. Ambos con el flujo de confirmación (`Más acciones` → confirmar) intacto.
- Importar CSV (`.csv` con headers "Nombre/Apellido/Teléfono/Email/Notas"): el wizard de 3 pasos (subir → mapear columnas → revisar) detectó los headers automáticamente y creó los 2 alumnos de prueba sin duplicados.
- Generar QR: `qr_token` se generó en la DB, y `/checkin/[gymSlug]/mi-qr/[token]` cargó con 200 OK mostrando el código y el nombre del alumno.

## 4. Rutinas — ✅ sin hallazgos
- Rutina nueva con 3 días (Torso/Pierna/Full body) creada correctamente.
- 3 ejercicios agregados desde la biblioteca (búsqueda + filtro por grupo muscular funcionando).
- **Drag & drop de reordenamiento**: confirmado que persiste en la DB (`order_index` actualizado) — la única particularidad es que la Server Action de reordenamiento tarda 1-2s en confirmarse tras soltar, más de lo que uno esperaría de un drag optimista; no es un bug, pero un usuario impaciente que recargue la página muy rápido después de soltar podría, en un caso límite, ver el orden viejo por un instante.
- **Exportar PDF**: genera un PDF real y descargable (verificado con los magic bytes `%PDF`, `content-type: application/pdf`, ~3KB de contenido real, no un archivo vacío o corrupto).
- Plantilla nueva creada y **asignada a un alumno**: se creó la rutina independiente (copia) esperada, sin afectar la plantilla original.

## 5. Asistencia — ✅ sin hallazgos funcionales | 1 hallazgo de UX
- Marcar presente → registro creado en `attendances`.
- Deshacer (vía el chip "Presente" → confirmar) → el registro se borra.
- **Check-in por QR** (`/checkin/[gymSlug]/scan?token=...`, simulando el escaneo): responde 200, muestra "¡Bienvenido {nombre}! 💪 Entrada registrada a las HH:MM" y crea el registro de asistencia correctamente — mismo resultado que marcar manual.
- **Hallazgo de UX — corregido el 2026-08-30**: el buscador de `/dashboard/asistencia` filtraba cada campo por separado (`first_name`, `last_name`, `phone`), nunca el nombre completo concatenado. Buscar "Ana Regresion" (nombre + apellido juntos, como escribiría naturalmente cualquier usuario) devolvía **"No encontramos alumnos con esos filtros"** aunque la alumna existiera — solo funcionaba buscando un campo a la vez ("Ana" o "Regresion" por separado). **Fix**: en `app/(dashboard)/dashboard/asistencia/page.tsx` el filtro ahora compara contra `nombreCompleto(first_name, last_name)` armado en el servidor (PostgREST no permite `ilike` sobre una expresión concatenada en el query string, solo sobre columnas reales, así que el filtro se resuelve en Next después de traer los alumnos activos del gym — un listado por gym es chico, no hace falta que lo resuelva la DB). Verificado en vivo: "Ana Regresion" y "Ana" sola encuentran a la alumna por igual.

## 6. Retención — ✅ sin hallazgos
- Regla nueva ("Regla QA 3 días", aplica a todos) creada.
- El motor de alertas (`syncRetentionAlerts`) corre automáticamente al visitar `/dashboard/retencion` — no hay ni hace falta un botón de "recalcular": se generaron las 2 alertas esperadas para los 2 alumnos forzados a "5 días sin venir".
- Marcar como **contactada** → `status='contacted'` en DB.
- **Resolver** con motivo ("Volvió a entrenar") → `status='resolved'`, `resolution_reason='volvio'` guardado.

## 7. Pagos — 🔴 1 bug real encontrado y corregido
- Plan nuevo ("Plan QA Mensual", $15.000, 30 días) creado.
- Asignado a un alumno → membership activa creada con la fecha de vencimiento correcta.
- **Cobrar y renovar** → la membership vieja pasó a `expired`, se creó una nueva `active`, y el pago quedó registrado en `payments`.
- Panel `/dashboard/pagos`: el alumno aparece correctamente clasificado.

**Bug encontrado — mal armado el `<label>` de los campos de monto**
(severidad: accesibilidad/usabilidad, no bloqueante para el flujo normal con
mouse):
- **Síntoma**: el campo "Precio" (alta de plan) y "Monto" (cobrar/registrar
  pago) tienen un signo "$" decorativo al lado del input. El `<label>` de
  esos 3 campos apuntaba (`for="..."`) a un `<div>` contenedor en vez de al
  `<input>` real.
- **Causa raíz**: en los 3 formularios, el `<FormControl>` (que es quien le
  inyecta el `id` al hijo para que el label lo pueda referenciar) envolvía
  al `<div className="relative">` completo (span del "$" + el input), en
  vez de envolver directamente al `<input>`. El helper de formularios de
  este proyecto (`components/ui/form.tsx`) clona su hijo directo con
  `React.cloneElement` para inyectarle el `id` — al clonar un `<div>`, el
  `id` terminaba en el div decorativo, no en el input.
- **Impacto real**: clickear el texto del label ("Precio"/"Monto") no
  enfocaba el campo (un hábito común de usuario), y cualquier lector de
  pantalla anunciaba el label sin asociarlo al control — el campo seguía
  siendo usable con mouse/touch normal, así que no bloqueaba el flujo, pero
  es un defecto real de accesibilidad, no cosmético.
- **Archivos**: `components/planes/plan-form.tsx` (campo "Precio"),
  `components/pagos/cobrar-renovar-dialog.tsx` y
  `components/pagos/registrar-pago-dialog.tsx` (campo "Monto" en ambos).
- **Fix aplicado**: se movió el `<div className="relative">` (con el "$" y
  el input) a quedar **fuera** de `<FormControl>`, y `<FormControl>` ahora
  envuelve directamente al `<Input>` — mismo resultado visual exacto (el
  "$" se sigue viendo en el mismo lugar), pero el `id` ahora cae en el
  input real. Verificado con una inspección del DOM: los 3 labels ahora
  apuntan a un elemento `<input>`, no a un `<div>`.
- **Patrón a repetir**: cualquier campo futuro con un prefijo/sufijo
  decorativo (ícono, "$", "%", etc.) tiene que envolver solo al `<Input>`
  con `<FormControl>`, y poner el elemento decorativo como hermano afuera —
  nunca envolver el grupo completo con `<FormControl>`.

## 8. Roles — ✅ sin hallazgos
- Owner invita a un staff → link de invitación generado.
- Invitación aceptada en un contexto de browser nuevo, sin cookies
  compartidas (simula incógnito) → cuenta de staff creada en el **mismo**
  gym que el owner que invitó, con `role='staff'`.
- El staff **no ve** "Negocio" ni "Equipo" en el sidebar.
- **Protección real verificada, no solo visual**: el staff intentando entrar
  directo por URL a `/dashboard/negocio` fue redirigido, no pudo forzar el
  acceso.
- El owner sigue viendo todo con normalidad.

## 9. Suscripción — ✅ sin hallazgos
- El estado de "período de prueba" con los días restantes se ve bien en
  `/dashboard/configuracion/suscripcion`.
- Iniciar el checkout de Mercado Pago generó una URL real de
  `mercadopago.com.ar/subscriptions/checkout` con un `preapproval_id` real
  — confirma que el backend arma la preapproval correctamente. La propia
  página de Mercado Pago devolvió un error genérico de "Hubo un error
  accediendo a esta página" con su propio branding — es Mercado Pago
  bloqueando el tráfico de un browser automatizado/headless (no se llegó a
  intentar ningún pago), no un problema de Constano.

## 10. Leads — ✅ sin hallazgos
Re-verificado como parte de esta regresión (ya se había probado de punta a
punta el día anterior, incluyendo el caso de abandono): landing → click
"Empezar gratis" → `/comenzar` → completar → lead guardado en DB → redirect
a `/signup` con nombre y email precargados exactos. Sin conversión todavía
(a propósito, no se completó el signup en esta corrida).

---

## Nota sobre falsos positivos durante la propia regresión

Varias veces el test automatizado reportó una falla que, al re-chequear con
más tiempo de espera, resultó ser el propio script revisando la base de
datos **antes** de que la Server Action terminara de confirmarse (UI
optimista + escritura real que tarda 1-2s más) — no bugs de la app. Se
verificó cada caso con una segunda consulta después de esperar más, antes de
darlo por bug real. Los únicos 2 hallazgos que sobrevivieron esa segunda
verificación son los de las secciones 5 (UX) y 7 (bug real) de arriba.

## Pendiente / fuera de alcance de esta regresión
- No se probó el webhook real de Mercado Pago con un pago de tarjeta de
  prueba completo (requiere dominio público, ya documentado como pendiente
  desde la sesión de suscripciones).
