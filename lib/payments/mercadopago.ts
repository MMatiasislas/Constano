import { MercadoPagoConfig, PreApproval } from "mercadopago";

import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/qr-checkin";
import type { SubscriptionPlanId } from "@/types/db";

function getConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta configurar MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.");
  }
  return new MercadoPagoConfig({ accessToken });
}

/**
 * Crea una suscripción recurrente ("preapproval") en Mercado Pago para el
 * plan elegido y devuelve la URL de checkout (`init_point`) a la que hay
 * que redirigir al usuario para que autorice el cobro recurrente.
 *
 * El precio SIEMPRE se lee de `subscription_plans` acá adentro (nunca se
 * recibe como parámetro) para que no haya forma de mandar un precio
 * distinto al que está configurado en la base.
 *
 * `external_reference` queda como `"{gymId}:{planId}"` — formato simple que
 * la Parte 2 (webhook de Mercado Pago) va a parsear con un `split(":")`
 * para saber a qué gym y plan corresponde el pago.
 */
export async function createSubscriptionCheckout(
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

  const preApproval = new PreApproval(getConfig());

  const result = await preApproval.create({
    body: {
      reason: `Constano — Plan ${plan.name}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: Number(plan.price_ars),
        currency_id: "ARS",
      },
      back_url: `${getSiteUrl()}/dashboard/configuracion/suscripcion/exito`,
      payer_email: payerEmail,
      external_reference: `${gymId}:${plan.id}`,
      status: "pending",
    },
  });

  if (!result.init_point) {
    throw new Error("Mercado Pago no devolvió una URL de checkout.");
  }

  return result.init_point;
}
