"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2Icon } from "lucide-react";

import { resolveAlert } from "@/app/(dashboard)/dashboard/retencion/actions";
import {
  resolutionReasonItems,
  resolveAlertSchema,
  type ResolveAlertFormValues,
} from "@/lib/validations/retention-alert";
import { RESOLUTION_REASON_OPTIONS } from "@/types/db";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ResolverAlertaDialog({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<ResolveAlertFormValues>({
    resolver: zodResolver(resolveAlertSchema),
    // "" en vez de undefined: el Select de Base UI tira un warning de consola
    // si pasa de no controlado a controlado en el primer render (mismo motivo
    // por el que otros Select del proyecto usan un sentinel de string, ver
    // `weeklyFrequency`/`ninguno`). El schema igual rechaza "" con su mensaje.
    defaultValues: { resolution_reason: "" as ResolveAlertFormValues["resolution_reason"], notes: "" },
  });

  async function handleSubmit(values: ResolveAlertFormValues) {
    setLoading(true);
    const result = await resolveAlert(alertId, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos resolver la alerta", { description: result.error });
      return;
    }

    toast.success("Alerta resuelta");
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
      <DialogTrigger render={<Button size="sm" />}>
        <CheckCircle2Icon />
        Resolver
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver alerta</DialogTitle>
          <DialogDescription>
            Contá qué pasó con este alumno. La alerta se cierra y deja de aparecer en la lista.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="resolution_reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo</FormLabel>
                  <Select
                    items={resolutionReasonItems}
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Elegí un motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RESOLUTION_REASON_OPTIONS.map((option) => (
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
                  <FormLabel>Nota (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ej: habló con Juan, vuelve la semana que viene" {...field} />
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
                {loading ? "Guardando..." : "Resolver alerta"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
