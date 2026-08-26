import { formatCurrency } from "@/lib/payments";
import type { Gym, GymSubscriptionRecord, GymSubscriptionStatus } from "@/types/db";

const DAY_MS = 24 * 60 * 60 * 1000;

function daysRemaining(untilISO: string, nowMs: number) {
  return Math.max(0, Math.ceil((new Date(untilISO).getTime() - nowMs) / DAY_MS));
}

export type SubscriptionStatusInfo =
  | { status: "trial"; daysRemaining: number; trialEndsAt: string }
  | { status: "grace_period"; daysRemaining: number; gracePeriodEndsAt: string }
  | { status: "active"; planId: string | null; currentPeriodEnd: string | null }
  | { status: "suspended" };

const GRACE_PERIOD_DAYS = 3;

/**
 * Calcula el estado REAL de la suscripción del gym — nunca confiar solo en
 * `gyms.subscription_status` (esa columna la actualiza el webhook de la
 * Parte 2 y puede haber quedado desactualizada). Se deriva siempre a partir
 * de las fechas + si hay una gym_subscription activa vigente.
 *
 * `activeSubscription` es la última fila de `gym_subscriptions` del gym con
 * status='active' y `current_period_end` todavía no vencido (o null si no
 * hay ninguna) — se resuelve en el caller (Server Component) para mantener
 * esta función pura y fácil de testear.
 */
export function getSubscriptionStatus(
  gym: Pick<Gym, "trial_ends_at" | "grace_period_ends_at">,
  activeSubscription: Pick<GymSubscriptionRecord, "plan_id" | "current_period_end"> | null,
  now: Date = new Date()
): SubscriptionStatusInfo {
  const nowMs = now.getTime();

  if (activeSubscription) {
    return {
      status: "active",
      planId: activeSubscription.plan_id,
      currentPeriodEnd: activeSubscription.current_period_end,
    };
  }

  if (gym.trial_ends_at && nowMs < new Date(gym.trial_ends_at).getTime()) {
    return {
      status: "trial",
      daysRemaining: daysRemaining(gym.trial_ends_at, nowMs),
      trialEndsAt: gym.trial_ends_at,
    };
  }

  // Si `grace_period_ends_at` todavía no se seteó a mano (ej. por un
  // proceso de la Parte 2), se calcula on-the-fly a partir del trial: los
  // 3 días de gracia arrancan cuando vence el trial.
  const gracePeriodEndsAt =
    gym.grace_period_ends_at ??
    (gym.trial_ends_at
      ? new Date(new Date(gym.trial_ends_at).getTime() + GRACE_PERIOD_DAYS * DAY_MS).toISOString()
      : null);

  if (gracePeriodEndsAt && nowMs < new Date(gracePeriodEndsAt).getTime()) {
    return {
      status: "grace_period",
      daysRemaining: daysRemaining(gracePeriodEndsAt, nowMs),
      gracePeriodEndsAt,
    };
  }

  return { status: "suspended" };
}

/**
 * Todavía no hay ningún bloqueo real de funcionalidades cableado (eso es la
 * Parte 2, junto con los webhooks) — esta función ya deja lista la regla
 * ("suspended" = bloqueado) para cuando se conecte.
 */
export function isGymBlocked(statusInfo: SubscriptionStatusInfo): boolean {
  return statusInfo.status === "suspended";
}

// Mismo formato que `formatCurrency` de lib/payments.ts (cuotas que el gym
// le cobra a SUS alumnos) — se reexporta acá con el nombre pedido para este
// módulo en vez de duplicar la lógica, misma plata, mismo formato.
export const formatPriceARS = formatCurrency;

export type { GymSubscriptionStatus };
