import { MessageCircle } from "lucide-react";

import { getCurrentGymId } from "@/lib/auth/get-gym-id";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/subscription";
import { whatsappHref } from "@/lib/members";
import { WHATSAPP_PLACEHOLDER_NUMBER } from "@/lib/marketing";
import { EstadoSuscripcionCard } from "@/components/suscripcion/estado-suscripcion-card";
import { PlanCard } from "@/components/suscripcion/plan-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Gym, GymSubscriptionRecord, SubscriptionPlan } from "@/types/db";

const CUSTOM_PLAN_MESSAGE =
  "Hola! Mi gimnasio ya tiene más de 200 alumnos, quiero consultar por un plan Custom en Constano.";

export default async function SuscripcionPage() {
  const gymId = await getCurrentGymId();
  const supabase = await createClient();

  const nowISO = new Date().toISOString();

  const [{ data: gym }, { data: plansData }, { data: activeSubscription }] = await Promise.all([
    supabase
      .from("gyms")
      .select("id, name, trial_ends_at, grace_period_ends_at, subscription_status, current_plan_id")
      .eq("id", gymId)
      .single(),
    supabase.from("subscription_plans").select("*").eq("active", true).order("price_ars"),
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

  const plans = (plansData ?? []) as SubscriptionPlan[];
  const statusInfo = getSubscriptionStatus(
    gym as Pick<Gym, "trial_ends_at" | "grace_period_ends_at">,
    activeSubscription as Pick<GymSubscriptionRecord, "plan_id" | "current_period_end"> | null
  );

  const currentPlanId = statusInfo.status === "active" ? statusInfo.planId : null;
  const currentPlanName = plans.find((plan) => plan.id === currentPlanId)?.name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tu suscripción</h1>
        <p className="text-muted-foreground">
          Elegí el plan que mejor se adapte a tu gimnasio.
        </p>
      </div>

      <EstadoSuscripcionCard statusInfo={statusInfo} planName={currentPlanName} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} isCurrent={plan.id === currentPlanId} />
        ))}
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div>
            <p className="font-medium text-foreground">¿Más de 200 alumnos?</p>
            <p className="text-sm text-muted-foreground">
              Armamos un plan Custom a medida de tu gimnasio.
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
            Hablanos por WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
