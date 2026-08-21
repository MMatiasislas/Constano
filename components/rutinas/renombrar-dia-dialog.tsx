"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PencilIcon } from "lucide-react";

import { renameRoutineDay } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/actions";
import { routineDayNameSchema, type RoutineDayNameValues } from "@/lib/validations/routine";
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
import type { RoutineDay } from "@/types/db";

export function RenombrarDiaDialog({
  day,
  memberId,
}: {
  day: RoutineDay;
  memberId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<RoutineDayNameValues>({
    resolver: zodResolver(routineDayNameSchema),
    defaultValues: { name: day.name },
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) form.reset({ name: day.name });
  }

  async function handleSubmit(values: RoutineDayNameValues) {
    setLoading(true);
    const result = await renameRoutineDay(day.id, day.routine_id, memberId, values.name);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos renombrar el día", { description: result.error });
      return;
    }

    toast.success("Día renombrado");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PencilIcon />
        Renombrar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Renombrar día</DialogTitle>
          <DialogDescription>Cambiá el nombre de este día de entrenamiento.</DialogDescription>
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
                    <Input autoFocus {...field} />
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
