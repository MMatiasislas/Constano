import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPriceARS } from "@/lib/subscription";
import { cn } from "@/lib/utils";
import type { SubscriptionPlan } from "@/types/db";
import { ElegirPlanDialog } from "./elegir-plan-dialog";

export function PlanCard({
  plan,
  isCurrent,
}: {
  plan: SubscriptionPlan;
  isCurrent: boolean;
}) {
  return (
    <Card className={cn("flex h-full flex-col", isCurrent && "border-primary ring-1 ring-primary")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          {plan.name}
          {isCurrent && <Badge>Plan actual</Badge>}
        </CardTitle>
        <p className="mt-1 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">
            {formatPriceARS(plan.price_ars)}
          </span>
          <span className="text-sm text-muted-foreground">/mes</span>
        </p>
        <p className="text-sm text-muted-foreground">
          {plan.max_members ? `Hasta ${plan.max_members} alumnos` : "Alumnos ilimitados"}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="flex flex-1 flex-col gap-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {isCurrent ? (
          <Button variant="outline" disabled className="w-full">
            Plan actual
          </Button>
        ) : (
          <ElegirPlanDialog planId={plan.id} planName={plan.name} />
        )}
      </CardContent>
    </Card>
  );
}
