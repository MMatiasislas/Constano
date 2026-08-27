"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { createRoutine } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/actions";
import {
  isSubscriptionSuspendedError,
  notifySubscriptionSuspended,
} from "@/components/suscripcion/subscription-toast";
import {
  dayCountItems,
  dayCountOptions,
  monthItems,
  monthOptions,
  routineFormSchema,
  type RoutineFormValues,
} from "@/lib/validations/routine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export function NuevaRutinaDialog({
  memberId,
  triggerLabel = "Nueva rutina",
}: {
  memberId: string;
  triggerLabel?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<RoutineFormValues>({
    resolver: zodResolver(routineFormSchema),
    defaultValues: {
      title: "",
      month_number: "ninguno",
      notes: "",
      days: [{ name: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "days",
  });

  function handleDayCountChange(value: string | null) {
    const count = Number(value);
    if (!value) return;
    if (count > fields.length) {
      for (let i = fields.length; i < count; i++) append({ name: "" });
    } else if (count < fields.length) {
      for (let i = fields.length; i > count; i--) remove(i - 1);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      form.reset({ title: "", month_number: "ninguno", notes: "", days: [{ name: "" }] });
    }
  }

  async function handleSubmit(values: RoutineFormValues) {
    setLoading(true);
    const result = await createRoutine(memberId, values);

    if (result?.error) {
      if (isSubscriptionSuspendedError(result.error)) {
        notifySubscriptionSuspended();
      } else {
        toast.error("No pudimos crear la rutina", { description: result.error });
      }
      setLoading(false);
      return;
    }

    toast.success("Rutina creada");
    setOpen(false);
    router.push(`/dashboard/alumnos/${memberId}/rutinas/${result.routineId}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva rutina</DialogTitle>
          <DialogDescription>Armá el bloque mensual y sus días de entrenamiento.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Agosto 2026" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="month_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mes</FormLabel>
                  <Select items={monthItems} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas generales</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Objetivos del bloque, aclaraciones, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>Cantidad de días</FormLabel>
              <Select
                items={dayCountItems}
                value={String(fields.length)}
                onValueChange={handleDayCountChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayCountOptions.map((value) => (
                    <SelectItem key={value} value={value}>
                      {dayCountItems[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
            <div className="flex flex-col gap-4">
              {fields.map((dayField, index) => (
                <FormField
                  key={dayField.id}
                  control={form.control}
                  name={`days.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Día {index + 1}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej: Torso, Push, Pierna, Full body, Cardio..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? "Creando..." : "Crear rutina"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
