"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { updatePlan } from "@/app/(dashboard)/dashboard/configuracion/planes/actions";
import { PlanForm } from "./plan-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PlanFormValues } from "@/lib/validations/plan";
import type { Plan } from "@/types/db";

export function EditarPlanDialog({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaultValues: PlanFormValues = {
    name: plan.name,
    price: String(plan.price),
    duration_days: String(plan.duration_days),
    active: plan.active,
  };

  async function handleSubmit(values: PlanFormValues) {
    const result = await updatePlan(plan.id, values);
    if (result?.error) return result;

    toast.success("Cambios guardados");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Editar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar plan</DialogTitle>
          <DialogDescription>Actualizá los datos de este plan.</DialogDescription>
        </DialogHeader>
        <PlanForm
          defaultValues={defaultValues}
          activeFieldLabel="Plan activo"
          errorTitle="No pudimos guardar los cambios"
          submitLabel="Guardar cambios"
          submitLoadingLabel="Guardando..."
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
