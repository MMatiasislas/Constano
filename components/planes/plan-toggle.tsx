"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { togglePlan } from "@/app/(dashboard)/dashboard/configuracion/planes/actions";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { Plan } from "@/types/db";

export function PlanToggle({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [prevPlan, setPrevPlan] = useState(plan);
  const [active, setActive] = useState(plan.active);
  const [loading, setLoading] = useState(false);

  if (plan !== prevPlan) {
    setPrevPlan(plan);
    setActive(plan.active);
  }

  async function handleChange(checked: boolean) {
    setLoading(true);
    setActive(checked);

    const result = await togglePlan(plan.id, checked);
    setLoading(false);

    if (result?.error) {
      setActive(!checked);
      toast.error("No pudimos actualizar el plan", { description: result.error });
      return;
    }

    toast.success(checked ? "Plan activado" : "Plan desactivado");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {!active && (
        <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
          Inactivo
        </Badge>
      )}
      <Switch checked={active} disabled={loading} onCheckedChange={handleChange} />
    </div>
  );
}
