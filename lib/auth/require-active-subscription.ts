import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { isGymBlocked, resolveSubscriptionStatus } from "@/lib/subscription";
import { SUBSCRIPTION_SUSPENDED_ERROR } from "@/lib/subscription-errors";

export { SUBSCRIPTION_SUSPENDED_ERROR };

/**
 * Corta la ejecución de una Server Action si el gym actual está
 * `suspended` (venció el trial + los 3 días de gracia sin activar ningún
 * plan). Tira `new Error(SUBSCRIPTION_SUSPENDED_ERROR)` — el caller lo
 * distingue de cualquier otro error y muestra el toast específico
 * ("Tu cuenta está suspendida...").
 *
 * **Patrón de uso**: llamarla primero, dentro del mismo `try/catch` que ya
 * tiene la Server Action (no hace falta un catch aparte — el mensaje
 * `SUBSCRIPTION_SUSPENDED_ERROR` se propaga como cualquier otro error y el
 * componente cliente lo distingue por el texto).
 * ```ts
 * export async function createMember(values: MemberFormValues) {
 *   try {
 *     await requireActiveSubscription();
 *     const gymId = await getCurrentGymId();
 *     ...
 *   } catch (err) {
 *     return { error: err instanceof Error ? err.message : "..." };
 *   }
 * }
 * ```
 *
 * **Solo para Server Actions de CREACIÓN/EDICIÓN.** Nunca usar en:
 * - Acciones de LECTURA (un gym suspendido debe poder seguir viendo sus
 *   datos existentes, solo pierde poder crear/editar).
 * - `startCheckout` (tiene que poder pagar mientras está suspendido — es la
 *   única forma de salir de ese estado).
 *
 * No cubre las 40+ Server Actions del proyecto — se aplicó como ejemplo
 * representativo en las de creación más importantes (`createMember`,
 * `createRoutine`, `markAttendance`). Replicar este mismo patrón (una sola
 * línea al principio del `try`) en cualquier otra acción de
 * creación/edición que se quiera proteger.
 */
export async function requireActiveSubscription() {
  const gymId = await getCurrentGymId();
  const statusInfo = await resolveSubscriptionStatus(gymId);

  if (isGymBlocked(statusInfo)) {
    throw new Error(SUBSCRIPTION_SUSPENDED_ERROR);
  }
}
