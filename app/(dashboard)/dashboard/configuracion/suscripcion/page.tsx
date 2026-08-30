import { MessageCircle } from "lucide-react";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { resolveSubscriptionStatus } from "@/lib/subscription";
import { whatsappHref } from "@/lib/members";
import { WHATSAPP_PLACEHOLDER_NUMBER } from "@/lib/marketing";
import { EstadoSuscripcionCard } from "@/components/suscripcion/estado-suscripcion-card";
import { PlanCard } from "@/components/suscripcion/plan-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { SubscriptionPlan } from "@/types/db";

const CUSTOM_PLAN_MESSAGE =
  "Hola! Mi gimnasio tiene más de 100 alumnos, quiero consultar por un plan a medida en Constano.";

export default async function SuscripcionPage() {
  const gymId = await getCurrentGymId();
  const supabase = await createClient();

  const [statusInfo, { data: plansData }] = await Promise.all([
    resolveSubscriptionStatus(gymId),
    supabase.from("subscription_plans").select("*").eq("active", true).order("price_ars"),
  ]);

  const plans = (plansData ?? []) as SubscriptionPlan[];
  const currentPlanId = statusInfo.status === "active" ? statusInfo.planId : null;
  const currentPlanName = plans.find((plan) => plan.id === currentPlanId)?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-medium tracking-tight">Tu suscripción</h1>
        <p className="text-muted-foreground">
          Elegí el plan que mejor se adapte a tu gimnasio.
        </p>
      </div>

      <EstadoSuscripcionCard statusInfo={statusInfo} planName={currentPlanName} />

      <div
        className={plans.length > 1 ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "max-w-sm"}
      >
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === currentPlanId} />
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="font-medium text-foreground">¿Tu gimnasio es más grande?</p>
            <p className="text-sm text-muted-foreground">
              Armamos un plan a medida para gimnasios con más de 100 alumnos, cadenas o
              necesidades especiales. Sin vueltas, hablamos y lo resolvemos.
            </p>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a
                href={whatsappHref(WHATSAPP_PLACEHOLDER_NUMBER, CUSTOM_PLAN_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
          >
            <MessageCircle />
            Hablar por WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
