"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { updateRoutineInfo } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/actions";
import {
  monthItems,
  monthOptions,
  routineInfoFormSchema,
  type RoutineInfoFormValues,
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
import type { Routine } from "@/types/db";

export function EditarInfoRutinaDialog({
  routine,
  memberId,
}: {
  routine: Routine;
  memberId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultValues: RoutineInfoFormValues = {
    title: routine.title,
    month_number: (routine.month_number
      ? String(routine.month_number)
      : "ninguno") as RoutineInfoFormValues["month_number"],
    notes: routine.notes ?? "",
  };

  const form = useForm<RoutineInfoFormValues>({
    resolver: zodResolver(routineInfoFormSchema),
    defaultValues,
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) form.reset(defaultValues);
  }

  async function handleSubmit(values: RoutineInfoFormValues) {
    setLoading(true);
    const result = await updateRoutineInfo(routine.id, memberId, values);
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
          <DialogDescription>Actualizá el título, el mes o las notas de la rutina.</DialogDescription>
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
                    <Input autoFocus {...field} />
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
