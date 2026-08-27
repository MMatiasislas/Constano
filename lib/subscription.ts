import { formatCurrency } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
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

async function persistGracePeriodEndsAt(gymId: string, gracePeriodEndsAt: string) {
  try {
    const supabase = createServiceRoleClient();
    const { error } = await supabase
      .from("gyms")
      .update({ grace_period_ends_at: gracePeriodEndsAt })
      .eq("id", gymId);

    if (error) {
      console.error("[getSubscriptionStatus] no se pudo persistir grace_period_ends_at", error);
    }
  } catch (err) {
    // Si falla (ej. todavía no está configurada SUPABASE_SERVICE_ROLE_KEY),
    // no bloqueamos el cálculo del estado — se recalcula on-the-fly la
    // próxima vez y se reintenta persistir entonces.
    console.error("[getSubscriptionStatus] no se pudo persistir grace_period_ends_at", err);
  }
}

/**
 * Calcula el estado REAL de la suscripción del gym — nunca confiar solo en
 * `gyms.subscription_status` (esa columna la actualizan los webhooks y
 * puede haber quedado desactualizada, ej. justo después de una
 * cancelación). Se deriva siempre a partir de las fechas + si hay una
 * gym_subscription activa vigente.
 *
 * `activeSubscription` es la última fila de `gym_subscriptions` del gym con
 * status='active' y `current_period_end` todavía no vencido (o null si no
 * hay ninguna) — se resuelve en el caller (Server Component) para no
 * acoplar esta función a un cliente de Supabase específico.
 *
 * **Única escritura que hace esta función**: la primera vez que detecta que
 * el trial venció y `gyms.grace_period_ends_at` todavía está en `null`, la
 * calcula (`trial_ends_at + 3 días`) y la persiste con un UPDATE simple
 * (vía service role, para que funcione sin importar el rol de quien esté
 * mirando la pantalla — la policy de `gyms` para UPDATE es solo para
 * 'owner'). Así la fecha de gracia queda fija una sola vez, en vez de
 * recalcularse (potencialmente distinto) en cada request.
 */
export async function getSubscriptionStatus(
  gym: Pick<Gym, "id" | "trial_ends_at" | "grace_period_ends_at">,
  activeSubscription: Pick<GymSubscriptionRecord, "plan_id" | "current_period_end"> | null,
  now: Date = new Date()
): Promise<SubscriptionStatusInfo> {
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

  let gracePeriodEndsAt = gym.grace_period_ends_at;

  if (!gracePeriodEndsAt && gym.trial_ends_at) {
    gracePeriodEndsAt = new Date(
      new Date(gym.trial_ends_at).getTime() + GRACE_PERIOD_DAYS * DAY_MS
    ).toISOString();
    await persistGracePeriodEndsAt(gym.id, gracePeriodEndsAt);
  }

  if (gracePeriodEndsAt && nowMs < new Date(gracePeriodEndsAt).getTime()) {
    return {
      status: "grace_period",
      daysRemaining: daysRemaining(gracePeriodEndsAt, nowMs),
      gracePeriodEndsAt,
    };
  }

  return { status: "suspended" };
}

export function isGymBlocked(statusInfo: SubscriptionStatusInfo): boolean {
  return statusInfo.status === "suspended";
}

/**
 * Trae el gym + su gym_subscription activa (si hay) con el cliente
 * autenticado normal, y devuelve el estado ya calculado — junta en un solo
 * lugar el fetching que se repetía en la página de suscripción, el layout
 * del dashboard (para el banner) y `requireActiveSubscription()`. Pensado
 * para llamarse desde un Server Component o una Server Action (usa
 * `lib/supabase/server.ts`, que depende de `cookies()`).
 */
export async function resolveSubscriptionStatus(
  gymId: string,
  now: Date = new Date()
): Promise<SubscriptionStatusInfo> {
  const supabase = await createClient();
  const nowISO = now.toISOString();

  const [{ data: gym }, { data: activeSubscription }] = await Promise.all([
    supabase.from("gyms").select("id, trial_ends_at, grace_period_ends_at").eq("id", gymId).single(),
    supabase
      .from("gym_subscriptions")
      .select("plan_id, current_period_end")
      .eq("gym_id", gymId)
      .eq("status", "active")
      .or(`current_period_end.is.null,current_period_end.gte.${nowISO}`)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!gym) {
    throw new Error("No encontramos los datos de tu gimnasio.");
  }

  return getSubscriptionStatus(
    gym as Pick<Gym, "id" | "trial_ends_at" | "grace_period_ends_at">,
    activeSubscription as Pick<GymSubscriptionRecord, "plan_id" | "current_period_end"> | null,
    now
  );
}

// Mismo formato que `formatCurrency` de lib/payments.ts (cuotas que el gym
// le cobra a SUS alumnos) — se reexporta acá con el nombre pedido para este
// módulo en vez de duplicar la lógica, misma plata, mismo formato.
export const formatPriceARS = formatCurrency;

export type { GymSubscriptionStatus };
