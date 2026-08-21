"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CopyIcon } from "lucide-react";

import { duplicateRoutine } from "@/app/(dashboard)/dashboard/alumnos/[id]/rutinas/[routineId]/actions";
import {
  duplicateRoutineSchema,
  monthItems,
  monthOptions,
  type DuplicateRoutineValues,
} from "@/lib/validations/routine";
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
import type { Routine } from "@/types/db";

export function DuplicarRutinaDialog({ routine, memberId }: { routine: Routine; memberId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const defaultValues: DuplicateRoutineValues = {
    title: `${routine.title} - copia`,
    month_number: "ninguno",
  };

  const form = useForm<DuplicateRoutineValues>({
    resolver: zodResolver(duplicateRoutineSchema),
    defaultValues,
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) form.reset(defaultValues);
  }

  async function handleSubmit(values: DuplicateRoutineValues) {
    setLoading(true);
    const result = await duplicateRoutine(routine.id, memberId, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos duplicar la rutina", { description: result.error });
      return;
    }

    toast.success("Rutina duplicada");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <CopyIcon />
        Duplicar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Duplicar rutina</DialogTitle>
          <DialogDescription>
            Se va a crear una copia completa (con días y ejercicios) para el mismo alumno.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la nueva rutina</FormLabel>
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
                  <FormLabel>Mes (opcional)</FormLabel>
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
            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={loading}>
                {loading ? "Duplicando..." : "Duplicar rutina"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
