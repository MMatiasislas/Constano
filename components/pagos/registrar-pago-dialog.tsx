"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format } from "date-fns";

import { registerPaymentOnly } from "@/app/(dashboard)/dashboard/alumnos/[id]/actions";
import { methodItems, paymentSchema, type PaymentFormValues } from "@/lib/validations/payment";
import { PAYMENT_METHODS } from "@/types/db";
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

function buildDefaultValues(): PaymentFormValues {
  return {
    amount: "",
    method: "efectivo",
    paid_at: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  };
}

export function RegistrarPagoDialog({ memberId }: { memberId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: buildDefaultValues(),
  });

  async function handleSubmit(values: PaymentFormValues) {
    setLoading(true);
    const result = await registerPaymentOnly(memberId, values);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos registrar el pago", { description: result.error });
      return;
    }

    toast.success("Pago registrado");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) form.reset(buildDefaultValues());
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Registrar pago sin renovar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago sin renovar</DialogTitle>
          <DialogDescription>
            Para señas, ajustes, venta de productos u otros cobros que no renuevan el plan.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">
                        $
                      </span>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          className="pl-6"
                          autoFocus
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paid_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de pago</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Método de pago</FormLabel>
                  <Select items={methodItems} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
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
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Ej: venta de proteína" {...field} />
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
                {loading ? "Registrando..." : "Registrar pago"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
