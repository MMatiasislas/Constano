import Stripe from "stripe";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/qr-checkin";
import type { SubscriptionPlanId } from "@/types/db";

function getClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Falta configurar STRIPE_SECRET_KEY en las variables de entorno.");
  }
  return new Stripe(secretKey);
}

/**
 * Crea una Stripe Checkout Session en modo `subscription` y devuelve su URL.
 *
 * **Decisión**: en vez de precios pre-creados en el dashboard de Stripe
 * (`STRIPE_PRICE_BASIC`/`PRO`/`MAX`), se arma el precio inline con
 * `price_data` en cada checkout, leyendo `price_ars` directo de
 * `subscription_plans` en ese momento. Ventaja: un solo lugar de verdad
 * para el precio (la tabla), sin tener que ir a sincronizar un Price del
 * dashboard de Stripe cada vez que cambia — no hace falta crear ni
 * documentar esos Price IDs.
 *
 * `unit_amount` va en la unidad mínima de la moneda (centavos) — ARS no es
 * una moneda "zero-decimal" para Stripe, así que se multiplica por 100.
 *
 * `client_reference_id`/`metadata` llevan `gymId`/`planId` para que la
 * Parte 2 (webhook de Stripe) pueda identificar el gym al confirmar el pago.
 * **Importante**: el `metadata` de la Session NO se copia solo al objeto
 * `Subscription` que Stripe crea — por eso también se manda
 * `subscription_data.metadata` con lo mismo, que es lo único que llega en
 * los eventos `customer.subscription.*` del webhook (esos eventos no
 * incluyen la Session, solo la Subscription).
 */
export async function createStripeCheckoutSession(
  gymId: string,
  planId: SubscriptionPlanId,
  payerEmail: string
): Promise<string> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("subscription_plans")
    .select("id, name, price_ars")
    .eq("id", planId)
    .eq("active", true)
    .single();

  if (error || !plan) {
    throw new Error("No encontramos ese plan.");
  }

  const stripe = getClient();
  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: payerEmail,
    client_reference_id: `${gymId}:${plan.id}`,
    metadata: { gymId, planId: plan.id },
    subscription_data: { metadata: { gymId, planId: plan.id } },
    line_items: [
      {
        price_data: {
          currency: "ars",
          unit_amount: Math.round(Number(plan.price_ars) * 100),
          recurring: { interval: "month" },
          product_data: { name: `Constano — Plan ${plan.name}` },
        },
        quantity: 1,
      },
    ],
    success_url: `${siteUrl}/dashboard/configuracion/suscripcion/exito`,
    cancel_url: `${siteUrl}/dashboard/configuracion/suscripcion/cancelado`,
  });

  if (!session.url) {
    throw new Error("Stripe no devolvió una URL de checkout.");
  }

  return session.url;
}
