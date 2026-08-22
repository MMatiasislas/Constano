"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { updateRetentionRule } from "@/app/(dashboard)/dashboard/configuracion/retencion/actions";
import { dbValueToFrequencyOption } from "@/lib/retention";
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
import type { RetentionRule } from "@/types/db";

export function EditarReglaDialog({ rule }: { rule: RetentionRule }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaultValues: RetentionRuleFormValues = {
    name: rule.name,
    days_without_attendance: String(rule.days_without_attendance),
    applies_to_frequency: dbValueToFrequencyOption(rule.applies_to_frequency),
    active: rule.active,
  };

  async function handleSubmit(values: RetentionRuleFormValues) {
    const result = await updateRetentionRule(rule.id, values);
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
          <DialogTitle>Editar regla</DialogTitle>
          <DialogDescription>Actualizá los datos de esta regla de retención.</DialogDescription>
        </DialogHeader>
        <ReglaForm
          defaultValues={defaultValues}
          activeFieldLabel="Regla activa"
          errorTitle="No pudimos guardar los cambios"
          submitLabel="Guardar cambios"
          submitLoadingLabel="Guardando..."
          onSubmit={handleSubmit}
        />
      </DialogContent>
    </Dialog>
  );
}
