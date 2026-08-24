"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { createPlan } from "@/app/(dashboard)/dashboard/configuracion/planes/actions";
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

const emptyValues: PlanFormValues = {
  name: "",
  price: "",
  duration_days: "30",
  active: true,
};

export function NuevoPlanDialog({
  triggerVariant = "default",
  triggerLabel = "Nuevo plan",
}: {
  triggerVariant?: "default" | "outline";
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: PlanFormValues) {
    const result = await createPlan(values);
    if (result?.error) return result;

    toast.success("Plan creado");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo plan</DialogTitle>
          <DialogDescription>
            Definí un plan para poder asignárselo a tus alumnos.
          </DialogDescription>
        </DialogHeader>
        <PlanForm
          defaultValues={emptyValues}
          activeFieldLabel="Activar plan al crear"
          errorTitle="No pudimos crear el plan"
          submitLabel="Crear plan"
          submitLoadingLabel="Creando..."
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
