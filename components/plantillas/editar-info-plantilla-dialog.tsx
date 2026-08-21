"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { updateTemplateInfo } from "@/app/(dashboard)/dashboard/rutinas/plantillas/[templateId]/actions";
import {
  templateUpdateSchema,
  type TemplateUpdateValues,
} from "@/lib/validations/routine-template";
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
import type { RoutineTemplate } from "@/types/db";

export function EditarInfoPlantillaDialog({ template }: { template: RoutineTemplate }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultValues: TemplateUpdateValues = {
    name: template.name,
    description: template.description ?? "",
  };

  const form = useForm<TemplateUpdateValues>({
    resolver: zodResolver(templateUpdateSchema),
    defaultValues,
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) form.reset(defaultValues);
  }

  async function handleSubmit(values: TemplateUpdateValues) {
    setLoading(true);
    const result = await updateTemplateInfo(template.id, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos guardar los cambios", { description: result.error });
      return;
    }

    toast.success("Cambios guardados");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <PencilIcon />
        Editar información
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar información</DialogTitle>
          <DialogDescription>Actualizá el nombre o la descripción de la plantilla.</DialogDescription>
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
                    <Input autoFocus {...field} />
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
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Para qué sirve esta plantilla, a quién va dirigida, etc." {...field} />
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
                {loading ? "Guardando..." : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
