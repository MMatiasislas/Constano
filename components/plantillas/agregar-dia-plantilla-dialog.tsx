"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusIcon } from "lucide-react";

import { addTemplateDay } from "@/app/(dashboard)/dashboard/rutinas/plantillas/[templateId]/actions";
import { templateDayNameSchema, type TemplateDayNameValues } from "@/lib/validations/routine-template";
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

export function AgregarDiaPlantillaDialog({
  templateId,
  onDayAdded,
}: {
  templateId: string;
  onDayAdded: (dayId: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<TemplateDayNameValues>({
    resolver: zodResolver(templateDayNameSchema),
    defaultValues: { name: "" },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) form.reset({ name: "" });
  }

  async function handleSubmit(values: TemplateDayNameValues) {
    setLoading(true);
    const result = await addTemplateDay(templateId, values.name);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos agregar el día", { description: result.error });
      return;
    }

    toast.success("Día agregado");
    setOpen(false);
    form.reset({ name: "" });
    if (result.dayId) onDayAdded(result.dayId);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon />
        Agregar día
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar día</DialogTitle>
          <DialogDescription>Sumá otro día de entrenamiento a esta plantilla.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre del día</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Torso, Push, Pierna, Full body, Cardio..." autoFocus {...field} />
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
                {loading ? "Agregando..." : "Agregar día"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
