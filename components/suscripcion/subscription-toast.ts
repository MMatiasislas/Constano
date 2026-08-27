import { toast } from "sonner";

import { SUBSCRIPTION_SUSPENDED_ERROR } from "@/lib/subscription-errors";

/**
 * Detecta el mensaje de error que devuelven las Server Actions protegidas
 * por `requireActiveSubscription()` y muestra un toast específico con link
 * a la pantalla de planes, en vez del mensaje de error genérico ("No
 * pudimos crear...").
 *
 * Uso en el `catch`/`if (result?.error)` de cualquier caller client-side:
 * ```ts
 * if (result?.error) {
 *   if (isSubscriptionSuspendedError(result.error)) {
 *     notifySubscriptionSuspended();
 *   } else {
 *     toast.error("No pudimos crear el alumno", { description: result.error });
 *   }
 *   return;
 * }
 * ```
 */
export function isSubscriptionSuspendedError(message: string | undefined | null): boolean {
  return message === SUBSCRIPTION_SUSPENDED_ERROR;
}

export function notifySubscriptionSuspended() {
  toast.error("Tu cuenta está suspendida", {
    description: "Activá un plan para seguir usando Constano.",
    action: {
      label: "Ver planes",
      onClick: () => {
        window.location.href = "/dashboard/configuracion/suscripcion";
      },
    },
  });
}
