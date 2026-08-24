"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { assignPlan } from "@/app/(dashboard)/dashboard/alumnos/[id]/actions";
import { assignPlanSchema, type AssignPlanFormValues } from "@/lib/validations/plan";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Plan } from "@/types/db";

export function AsignarPlanDialog({
  memberId,
  planes,
  defaultStartDate,
  triggerLabel = "Asignar plan",
  triggerVariant = "default",
}: {
  memberId: string;
  planes: Plan[];
  defaultStartDate: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const planItems = Object.fromEntries(planes.map((plan) => [plan.id, plan.name]));

  const form = useForm<AssignPlanFormValues>({
    resolver: zodResolver(assignPlanSchema),
    defaultValues: { plan_id: "", start_date: defaultStartDate },
  });

  async function handleSubmit(values: AssignPlanFormValues) {
    setLoading(true);
    const result = await assignPlan(memberId, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos asignar el plan", { description: result.error });
      return;
    }

    toast.success("Plan asignado");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) form.reset({ plan_id: "", start_date: defaultStartDate });
      }}
    >
      <DialogTrigger render={<Button variant={triggerVariant} size="sm" />}>
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{triggerLabel}</DialogTitle>
          <DialogDescription>
            La membership anterior de este alumno (si tenía una activa) va a pasar a vencida.
          </DialogDescription>
        </DialogHeader>
        {planes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Todavía no tenés planes activos. Creá uno primero en Configuración → Planes.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="plan_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select items={planItems} value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Elegí un plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {planes.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} · ${Number(plan.price).toLocaleString("es-AR")} ·{" "}
                            {plan.duration_days} días
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de inicio</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? "Asignando..." : "Asignar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
