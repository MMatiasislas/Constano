# Auditoría de la landing en producción (2026-09-01)

Auditoría completa de **https://constano.com** (dominio recién conectado), corrida contra el
sitio real en vivo, no localhost — con Playwright headless para lo interactivo y `curl`/`openssl`
para lo de infraestructura (redirects, SSL). Checklist de 10 puntos pedido por Matías.

## Resultado en una línea

**2 bugs reales encontrados y corregidos — uno de ellos crítico** (el build de producción estaba
roto desde el último push). El resto del sitio (navegación, formularios, calculadora, responsive,
links, HTTPS) pasó todos los chequeos sin hallazgos.

---

## 🔴 Bug crítico: el último deploy no había podido construirse

**Causa raíz**: el commit más reciente (`64fa895`, "Actualizar numero de WhatsApp real en la
landing") dejó `lib/marketing.ts` con un string sin cerrar:
```ts
export const WHATSAPP_PLACEHOLDER_NUMBER = "5492235507397.;
```
(el cierre `";` quedó reemplazado por `.;`, probablemente una edición manual que se comió la
comilla). Esto es un error de sintaxis de TypeScript — `next build` lo rechaza siempre, no hay
forma de que compile.

**Impacto real**: Vercel, al fallar el build de ese commit, se quedó sirviendo el **deploy
anterior** (`4b8f6b1`, el primer commit que sí puso el número real y compiló bien) — por eso el
sitio en vivo se veía normal y con el WhatsApp correcto, pero el repo en `main` estaba en un
estado que **no podía desplegarse**. Cualquier cambio nuevo que se pusheara iba a quedar
silenciosamente sin publicar hasta corregir esto, sin ningún aviso visible salvo el email de
Vercel avisando que el build falló (fácil de no ver a tiempo).

**Fix**: se corrigió el string (`lib/marketing.ts`) y se corrió `npm run build` real (no solo
`tsc --noEmit`) para confirmar que el build completo pasa — generó las 31 rutas esperadas sin
errores. Se aprovechó para limpiar 2 comentarios `// PLACEHOLDER` que habían quedado desactualizados
en `pricing-section.tsx` y `footer-section.tsx` (el número ya no es un placeholder).

**Recomendación a futuro**: antes de pushear a `main` un cambio manual chico (como este), correr
`npm run build` local — hubiera atajado esto en el momento. Vale la pena considerar un check de
CI que bloquee el merge si el build falla, para no depender de notarlo por el email de Vercel.

---

## 🔴 Bug real: "¿Olvidaste tu contraseña?" llevaba a un 404

**Causa raíz**: el link de `/login` (`components/marketing/../app/(auth)/login/page.tsx`) apunta
a `/forgot-password` desde siempre — esa página nunca se había construido (quedó documentado como
pendiente en una sesión mucho más vieja del proyecto y se perdió de vista). En producción esto se
manifestaba de 2 formas: (1) un `console.error` 404 real en **cada carga de `/login`**, porque
Next.js prefetchea en segundo plano los links visibles en pantalla — el checklist de la auditoría
lo agarró ahí, sin necesidad de clickear nada; y (2) si un usuario real clickeaba el link, caía a
la página 404 genérica del sitio, sin ninguna forma de recuperar su contraseña.

**Fix — se construyó el flujo completo, no solo se sacó el link**:
- `app/(auth)/forgot-password/page.tsx`: pide el email, llama a
  `supabase.auth.resetPasswordForEmail(email, { redirectTo: ".../reset-password" })`. Muestra
  siempre el mismo mensaje de éxito exista o no esa cuenta (práctica estándar, no revela qué
  emails están registrados).
- `app/(auth)/reset-password/page.tsx`: la página a la que Supabase redirige desde el email.
  Escucha el evento `PASSWORD_RECOVERY` de `onAuthStateChange` (con un `getSession()` de red de
  contención por si la carrera entre el cliente procesando el token de la URL y el montaje del
  componente lo pierde) antes de mostrar el form de contraseña nueva — si no llega nada en 4s
  (link viejo, ya usado, o alguien entrando directo a la URL), muestra un estado de "link
  inválido" en vez de romper. Guarda la nueva contraseña con `supabase.auth.updateUser()`.
- Mismo estilo visual que `/login`/`/signup` (mismos componentes `Card`/`Form`/`Button`), sin
  tocar el link original de `/login`.
- Verificado en local: el form envía y muestra "Revisá tu email"; `/reset-password` sin token
  (acceso directo) muestra correctamente "Este link ya no es válido" en vez de crashear. Sin
  errores de consola en ningún paso. `npm run build` genera ambas rutas como estáticas
  (`○ /forgot-password`, `○ /reset-password`) sin errores.

**⚠️ Pendiente manual de Matías, no lo puedo hacer yo**: para que el link del email realmente
funcione en producción, en el **dashboard de Supabase → Authentication → URL Configuration** hay
que agregar `https://www.constano.com/reset-password` a la lista de Redirect URLs permitidas (por
default Supabase rechaza redirects a dominios no explícitamente autorizados). Sin este paso, el
flujo de arriba queda armado pero el link del email fallaría igual en producción — no se pudo
verificar el envío real del email ni el click en el link desde acá, solo el comportamiento de las
2 páginas nuevas.

---

## Checklist completo — qué se probó y qué dio bien

### 1. Carga y renderizado — ✅
Status 200, sin errores ni warnings de consola en `/` (los únicos errores de consola de todo el
sitio eran el 404 de `/forgot-password`, ya corregido). `<title>`: "Constano — Software de gestión
y retención para gimnasios". Meta description presente y coherente. Favicon carga 200.

### 2. Navegación — ✅
- Los 3 links del header (Características/Cómo funciona/Precios) hacen scroll a su `#hash`
  correcto, sección visible confirmada por `boundingBox`.
- Logo → `/`.
- "Iniciar sesión" → `/login`.
- Menú hamburguesa mobile abre y cierra bien, su propio CTA también funciona.
- **6 botones "Empezar/Empezá/Probar gratis" en todo el sitio** (header desktop, header mobile,
  hero, calculadora de ahorro, card de precio, CTA final) — los 6 confirmados apuntando a
  `/comenzar`, ninguno a `/signup` directo.

### 3. Formulario /comenzar → /signup — ✅, incluido el signup real en producción
Se completó el formulario con datos de prueba, confirmó el precargado exacto de `gym_name`/`email`
en `/signup`, y se **completó una cuenta real de punta a punta en producción** (crítico, como
pedía el checklist): sesión inmediata, llegó a `/dashboard`, cero errores de consola. Se limpió la
cuenta de prueba después (usuario + gym borrados vía Supabase).

### 4. WhatsApp — ✅ (ver el bug crítico de arriba para el detalle de por qué esto casi no llega)
Botón de la card "Custom" en precios y el link del footer usan el número real
(`5492235507397`) con mensajes coherentes en español ("Hola! Mi gimnasio tiene más de 100
alumnos..." / "Hola! Tengo una consulta sobre Constano.").

### 5. Calculadora de ahorro — ✅
- Drag real con mouse (no solo `.fill()`) mueve el slider correctamente.
- Drag con touch (`hasTouch: true`, viewport mobile) también mueve el slider.
- Fórmula verificada exacta en los 3 puntos pedidos:

  | Alumnos | Horas mostradas | Esperado |
  |---|---|---|
  | 25  | ~8.3 hs  | ~8.3 hs ✅ |
  | 150 | ~50.0 hs | ~50.0 hs ✅ |
  | 300 | ~100.0 hs | ~100.0 hs ✅ |

- Botón CTA de la sección → `/comenzar` ✅.

### 6. Responsive — ✅
375px / 768px / 1440px: sin scroll horizontal no deseado en ninguno (`scrollWidth` =
`clientWidth` en los 3). Ninguna sección cortada ni con texto superpuesto (revisado con capturas
por tramo de scroll, no solo la página completa). La tabla comparativa en mobile: confirmado que
scrollea horizontal dentro de su propio contenedor (`scrollWidth` 720px vs `clientWidth` 341px, y
forzar el scroll revela la columna "Constano" con los checks verdes) sin arrastrar el resto de la
página.

### 7. SEO básico — 🟡 2 faltaban, ya agregados
- `robots.txt`: **no existía (404)** → agregado (`app/robots.ts`, convención nativa de Next.js).
  Permite indexar la landing pública, bloquea `/dashboard`, `/checkin` y `/invitacion`.
- `sitemap.xml`: **no existía (404)** → agregado (`app/sitemap.ts`), por ahora solo con la home
  (no hay otras páginas de contenido de marketing todavía).
- Imágenes con `alt`: no aplica — la landing no usa ninguna etiqueta `<img>`/`<Image>`, todo son
  íconos SVG de `lucide-react` y mockups armados con `div`s.
- Sin errores/warnings de consola visibles en producción (una vez corregido el 404 de
  forgot-password).

### 8. Enlaces rotos — ✅ (tras el fix)
Se recorrieron todos los `href` únicos de la home (8 links + 2 `wa.me`) — 0 devolvieron ≥400. El
único roto de todo el sitio era `/forgot-password`, ya corregido arriba.

### 9. Formularios y validaciones — ✅, con un matiz menor (ver hallazgos de pulido)
- Campos vacíos en `/comenzar`: se queda en la página, muestra "Ingresá el nombre de tu gimnasio"
  / "Ingresá tu email" en rojo bajo cada campo — no crashea.
- Email con formato inválido: bloquea el envío. El mensaje que se ve es el tooltip nativo del
  navegador (ver hallazgo de pulido más abajo), no crashea tampoco.

### 10. HTTPS y seguridad básica — ✅
- `https://constano.com` carga con certificado válido (Let's Encrypt, `CN=www.constano.com`,
  vigente hasta el 30/11/2026).
- `http://constano.com` → 308 → `https://constano.com` → 308 → `https://www.constano.com` (200).
- `http://www.constano.com` → 308 directo a `https://www.constano.com`.
- Las 2 variantes de dominio (con y sin `www`) terminan siempre en `https://www.constano.com`.

---

## Hallazgos de pulido (no son bugs, no se tocaron sin confirmar antes)

1. **Validación de email en `/comenzar` con formato muy inválido** (sin ningún `@`): el navegador
   intercepta con su propio tooltip nativo en **inglés** ("Please include an '@' in the email
   address...") antes de que llegue a mostrarse el mensaje en español que ya tiene armado el
   formulario ("Ingresá un email válido"). No rompe nada — el form sigue sin poder enviarse — pero
   se ve inconsistente con el resto de la UI en español. Se arregla agregando `noValidate` al
   `<form>` para que sea siempre la validación de Zod (ya en español) la que se vea, nunca la del
   navegador. No se tocó — es una decisión de UI menor, no un bug.
2. **`public/` todavía tiene los SVG de ejemplo que trae Next.js por default** (`file.svg`,
   `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) — no se usan en ningún lado del proyecto
   (la landing es toda íconos de `lucide-react` + `div`s). No rompen nada, es solo peso muerto en
   el repo. No se tocaron.

## Qué no se pudo verificar desde acá
- El envío real del email de recuperación de contraseña y el click en el link (necesita la
  configuración de Redirect URLs en Supabase mencionada arriba, más acceso a una bandeja de
  entrada real).
- El contenido exacto del email que manda Supabase (usa la plantilla default de Supabase Auth —
  si se quiere personalizarla con la marca de Constano, es aparte, en el dashboard de Supabase).
