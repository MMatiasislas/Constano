import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { GymSubscriptionRecordStatus, SubscriptionPlanId } from "@/types/db";

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta configurar STRIPE_SECRET_KEY en las variables de entorno.");
  }
  return new Stripe(secretKey);
}

function mapSubscriptionStatus(stripeStatus: Stripe.Subscription.Status): GymSubscriptionRecordStatus {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "cancelled";
    case "incomplete":
    case "past_due":
    case "paused":
      return "pending";
    default:
      return "failed";
  }
}

/**
 * Crea o actualiza la fila de `gym_subscriptions` correspondiente a esta
 * Subscription de Stripe, y si quedó activa, refleja eso en `gyms`.
 *
 * `gymId`/`planId` salen de `subscription.metadata` — ver el comentario en
 * `lib/payments/stripe.ts` sobre por qué hace falta `subscription_data.metadata`
 * al crear el checkout (el metadata de la Session no alcanza acá).
 */
async function upsertFromSubscription(subscription: Stripe.Subscription) {
  const gymId = subscription.metadata?.gymId;
  const planId = subscription.metadata?.planId as SubscriptionPlanId | undefined;

  if (!gymId || !planId) {
    console.error(
      "[webhook stripe] falta metadata gymId/planId en la subscription",
      subscription.id
    );
    return;
  }

  const supabase = createServiceRoleClient();
  const status = mapSubscriptionStatus(subscription.status);

  // `current_period_start/end` vive en el SubscriptionItem, no en la
  // Subscription directamente (Stripe lo movió ahí en una versión reciente
  // de la API — confirmado revisando los tipos del SDK instalado, no
  // asumido de memoria).
  const item = subscription.items.data[0];
  const periodStart = item
    ? new Date(item.current_period_start * 1000).toISOString()
    : new Date().toISOString();
  const periodEnd = item ? new Date(item.current_period_end * 1000).toISOString() : null;

  const { data: existing } = await supabase
    .from("gym_subscriptions")
    .select("id")
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("gym_subscriptions")
      .update({ status, current_period_start: periodStart, current_period_end: periodEnd })
      .eq("id", existing.id);
  } else {
    await supabase.from("gym_subscriptions").insert({
      gym_id: gymId,
      plan_id: planId,
      provider: "stripe",
      provider_subscription_id: subscription.id,
      status,
      current_period_start: periodStart,
      current_period_end: periodEnd,
    });
  }

  if (status === "active") {
    await supabase
      .from("gyms")
      .update({ subscription_status: "active", current_plan_id: planId })
      .eq("id", gymId);
  }
  // Igual que en el webhook de Mercado Pago: si no quedó activa, no
  // tocamos gyms.subscription_status/current_plan_id a propósito —
  // getSubscriptionStatus() recalcula el estado real la próxima vez que se
  // consulte.
}

async function markCancelled(subscription: Stripe.Subscription) {
  const supabase = createServiceRoleClient();
  await supabase
    .from("gym_subscriptions")
    .update({ status: "cancelled" })
    .eq("provider", "stripe")
    .eq("provider_subscription_id", subscription.id);
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error("[webhook stripe] falta el header stripe-signature o STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  // La verificación de firma necesita el body CRUDO (sin parsear) — por eso
  // se lee como texto en vez de con request.json().
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    // Firma inválida: alguien intentando falsificar un webhook, o el
    // secreto configurado no coincide. Nunca se procesa sin esta
    // verificación.
    console.error("[webhook stripe] firma inválida", err);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.subscription) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await getStripeClient().subscriptions.retrieve(subscriptionId);
          await upsertFromSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        await upsertFromSubscription(event.data.object);
        break;
      }
      case "customer.subscription.deleted": {
        await markCancelled(event.data.object);
        break;
      }
      default:
        // Evento de Stripe que no necesitamos procesar acá.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook stripe] error procesando el evento", event.type, err);
    // 500 a propósito: Stripe reintenta automáticamente si no recibe 2xx,
    // lo cual es lo que queremos ante un error nuestro transitorio.
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
