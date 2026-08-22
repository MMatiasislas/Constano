"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { XCircleIcon } from "lucide-react";

import { dismissAlert } from "@/app/(dashboard)/dashboard/retencion/actions";
import {
  dismissAlertSchema,
  type DismissAlertFormValues,
} from "@/lib/validations/retention-alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function DescartarAlertaDialog({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<DismissAlertFormValues>({
    resolver: zodResolver(dismissAlertSchema),
    defaultValues: { notes: "" },
  });

  async function handleSubmit(values: DismissAlertFormValues) {
    setLoading(true);
    const result = await dismissAlert(alertId, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos descartar la alerta", { description: result.error });
      return;
    }

    toast.success("Alerta descartada");
    setOpen(false);
    form.reset();
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <XCircleIcon />
        Descartar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descartar alerta</DialogTitle>
          <DialogDescription>
            Usalo si es un falso positivo (ej. el alumno está de viaje avisado). La alerta se
            cierra sin contar como resuelta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: avisó que está de vacaciones hasta el 10" {...field} />
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
                {loading ? "Guardando..." : "Descartar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
