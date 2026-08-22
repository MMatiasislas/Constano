"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { createRetentionRule } from "@/app/(dashboard)/dashboard/configuracion/retencion/actions";
import { ReglaForm } from "./regla-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { RetentionRuleFormValues } from "@/lib/validations/retention-rule";

const emptyValues: RetentionRuleFormValues = {
  name: "",
  days_without_attendance: "10",
  applies_to_frequency: "all",
  active: true,
};

export function NuevaReglaDialog({
  triggerVariant = "default",
  triggerLabel = "Nueva regla",
}: {
  triggerVariant?: "default" | "link";
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleSubmit(values: RetentionRuleFormValues) {
    const result = await createRetentionRule(values);
    if (result?.error) return result;

    toast.success("Regla creada");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={triggerVariant} />}>
        {triggerVariant === "default" && <PlusIcon />}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva regla de retención</DialogTitle>
          <DialogDescription>
            Definí cuándo Constano te va a avisar que un alumno está en riesgo.
          </DialogDescription>
        </DialogHeader>
        <ReglaForm
          defaultValues={emptyValues}
          activeFieldLabel="Activar regla al crear"
          errorTitle="No pudimos crear la regla"
          submitLabel="Crear regla"
          submitLoadingLabel="Creando..."
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
