"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { createTemplate } from "@/app/(dashboard)/dashboard/rutinas/plantillas/actions";
import { dayCountItems, dayCountOptions } from "@/lib/validations/routine";
import { templateSchema, type TemplateFormValues } from "@/lib/validations/routine-template";
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

const emptyValues: TemplateFormValues = {
  name: "",
  description: "",
  days: [{ name: "" }],
};

export function NuevaPlantillaDialog({ triggerLabel = "Nueva plantilla" }: { triggerLabel?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: emptyValues,
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
    if (!nextOpen) form.reset(emptyValues);
  }

  async function handleSubmit(values: TemplateFormValues) {
    setLoading(true);
    const result = await createTemplate(values);

    if (result?.error) {
      toast.error("No pudimos crear la plantilla", { description: result.error });
      setLoading(false);
      return;
    }

    toast.success("Plantilla creada");
    setOpen(false);
    router.push(`/dashboard/rutinas/plantillas/${result.templateId}`);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <PlusIcon />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva plantilla</DialogTitle>
          <DialogDescription>
            Armá una plantilla reutilizable con sus días. Después le agregás los ejercicios.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Full body iniciación" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Para qué sirve esta plantilla, a quién va dirigida, etc." {...field} />
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
                {loading ? "Creando..." : "Crear plantilla"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
