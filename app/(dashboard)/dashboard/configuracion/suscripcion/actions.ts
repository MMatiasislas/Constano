"use server";

import { redirect } from "next/navigation";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { createSubscriptionCheckout } from "@/lib/payments/mercadopago";
import { createStripeCheckoutSession } from "@/lib/payments/stripe";
import type { PaymentProvider, SubscriptionPlanId } from "@/types/db";

export async function startCheckout(planId: SubscriptionPlanId, provider: PaymentProvider) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return { error: "No hay una sesión activa. Iniciá sesión de nuevo." };
  }

  let gymId: string;
  try {
    gymId = await getCurrentGymId();
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No encontramos tu gimnasio.",
    };
  }

  let checkoutUrl: string;
  try {
    checkoutUrl =
      provider === "mercadopago"
        ? await createSubscriptionCheckout(gymId, planId, user.email)
        : await createStripeCheckoutSession(gymId, planId, user.email);
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "No pudimos iniciar el pago. Intentá de nuevo.",
    };
  }

  // `redirect()` fuera del try/catch a propósito: tira una excepción especial
  // (NEXT_REDIRECT) que Next.js necesita que se propague sin ser atrapada.
  redirect(checkoutUrl);
}
