import { NextResponse, type NextRequest } from "next/server";
import { MercadoPagoConfig, PreApproval } from "mercadopago";

import { createServiceRoleClient } from "@/lib/supabase/service-role";
import type { GymSubscriptionRecordStatus, SubscriptionPlanId } from "@/types/db";

const DAY_MS = 24 * 60 * 60 * 1000;

function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Falta configurar MERCADOPAGO_ACCESS_TOKEN en las variables de entorno.");
  }
  return new MercadoPagoConfig({ accessToken });
}

function mapPreapprovalStatus(mpStatus: string | undefined): GymSubscriptionRecordStatus {
  switch (mpStatus) {
    case "authorized":
      return "active";
    case "cancelled":
    // Una suscripción "pausada" no está cobrando — no tenemos un bucket
    // 'paused' propio en gym_subscriptions.status, así que se guarda como
    // 'cancelled' (no-activa), que es lo que importa para
    // getSubscriptionStatus().
    case "paused":
      return "cancelled";
    case "pending":
      return "pending";
    default:
      return "failed";
  }
}

/**
 * Mercado Pago manda la notificación con el id de la preapproval en la
 * query string (`?type=preapproval&id=...` / `?topic=preapproval&id=...`,
 * formato IPN clásico) o en el body JSON (`{type: "preapproval", data:
 * {id: "..."}}` o `{type: "subscription_preapproval", ...}`, formato de
 * webhooks v2 más nuevo) — se soportan ambos formatos por las dudas, ya que
 * no hay forma de confirmar cuál manda MP sin un webhook real en vivo.
 */
async function extractPreapprovalId(request: NextRequest): Promise<string | null> {
  const { searchParams } = new URL(request.url);
  const queryType = searchParams.get("type") ?? searchParams.get("topic");
  const queryId = searchParams.get("id") ?? searchParams.get("data.id");

  if (queryId && (!queryType || queryType.includes("preapproval"))) {
    return queryId;
  }

  try {
    const body = await request.json();
    const bodyType: string | undefined = body?.type;
    const bodyId: string | undefined = body?.data?.id ?? body?.id;

    if (bodyId && (!bodyType || bodyType.includes("preapproval"))) {
      return String(bodyId);
    }
  } catch {
    // Sin body JSON válido (ej. una notificación GET) — no hay más de dónde
    // sacar el id.
  }

  return null;
}

export async function POST(request: NextRequest) {
  let preapprovalId: string | null;
  try {
    preapprovalId = await extractPreapprovalId(request);
  } catch (err) {
    console.error("[webhook mercadopago] no se pudo leer la notificación", err);
    return NextResponse.json({ ok: true });
  }

  if (!preapprovalId) {
    // Notificación de un tipo que no nos interesa (ej. "payment" suelto,
    // no ligado a una preapproval) — no es un error, se ignora.
    return NextResponse.json({ ok: true });
  }

  try {
    // Fuente de verdad: SIEMPRE se re-consulta el estado real a la API de
    // MP con nuestro access token, nunca se confía en el payload de la
    // notificación (que cualquiera podría intentar falsificar).
    const preApproval = new PreApproval(getMercadoPagoConfig());
    const subscription = await preApproval.get({ id: preapprovalId });

    const [gymId, planId] = (subscription.external_reference ?? "").split(":");
    if (!gymId || !planId) {
      console.error(
        "[webhook mercadopago] external_reference inválido o ausente:",
        subscription.external_reference
      );
      return NextResponse.json({ ok: true });
    }

    const supabase = createServiceRoleClient();
    const status = mapPreapprovalStatus(subscription.status);

    const { data: existing } = await supabase
      .from("gym_subscriptions")
      .select("id")
      .eq("provider", "mercadopago")
      .eq("provider_subscription_id", preapprovalId)
      .maybeSingle();

    const periodStart = new Date().toISOString();
    const periodEnd = subscription.next_payment_date ?? new Date(Date.now() + 30 * DAY_MS).toISOString();

    if (existing) {
      await supabase
        .from("gym_subscriptions")
        .update({ status, current_period_start: periodStart, current_period_end: periodEnd })
        .eq("id", existing.id);
    } else {
      await supabase.from("gym_subscriptions").insert({
        gym_id: gymId,
        plan_id: planId as SubscriptionPlanId,
        provider: "mercadopago",
        provider_subscription_id: preapprovalId,
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
    // Si no quedó activa (cancelada/pausada), a propósito NO tocamos
    // gyms.subscription_status/current_plan_id acá — getSubscriptionStatus()
    // recalcula el estado real la próxima vez que se consulte (puede seguir
    // en grace_period si corresponde, no forzamos "suspended").

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook mercadopago] error procesando la notificación", preapprovalId, err);
    // 500 a propósito (no 200): MP reintenta la notificación si no recibe
    // 200, lo cual es lo que queremos ante un error nuestro transitorio (ej.
    // la DB no respondió) — un 200 acá silenciaría el reintento.
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
