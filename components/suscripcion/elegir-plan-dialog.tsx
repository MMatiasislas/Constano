"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Loader2, Wallet } from "lucide-react";

import { startCheckout } from "@/app/(dashboard)/dashboard/configuracion/suscripcion/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { PaymentProvider, SubscriptionPlanId } from "@/types/db";

export function ElegirPlanDialog({
  planId,
  planName,
}: {
  planId: SubscriptionPlanId;
  planName: string;
}) {
  const [open, setOpen] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<PaymentProvider | null>(null);

  async function handleChoose(provider: PaymentProvider) {
    setLoadingProvider(provider);
    const result = await startCheckout(planId, provider);
    // Si `startCheckout` funcionó, ya redirigió al usuario afuera de la app
    // (a MP o Stripe) y esta función nunca sigue ejecutándose. Si llegamos
    // acá es porque devolvió un error en vez de redirigir.
    setLoadingProvider(null);
    if (result?.error) {
      toast.error("No pudimos iniciar el pago", { description: result.error });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button className="w-full" />}>Elegir este plan</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elegí cómo pagar el plan {planName}</DialogTitle>
          <DialogDescription>
            Te vamos a redirigir a una pantalla segura para completar el pago.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            variant="outline"
            className="h-16 justify-start gap-3 px-4"
            disabled={loadingProvider !== null}
            onClick={() => handleChoose("mercadopago")}
          >
            <Wallet className="size-5 shrink-0 text-sky-500" />
            <span className="flex flex-col items-start">
              <span className="font-semibold text-foreground">Mercado Pago</span>
              <span className="text-xs font-normal text-muted-foreground">
                Tarjeta, débito o dinero en cuenta
              </span>
            </span>
            {loadingProvider === "mercadopago" && (
              <Loader2 className="ml-auto size-4 animate-spin" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-16 justify-start gap-3 px-4"
            disabled={loadingProvider !== null}
            onClick={() => handleChoose("stripe")}
          >
            <CreditCard className="size-5 shrink-0 text-violet-500" />
            <span className="flex flex-col items-start">
              <span className="font-semibold text-foreground">Stripe</span>
              <span className="text-xs font-normal text-muted-foreground">
                Tarjeta de crédito o débito
              </span>
            </span>
            {loadingProvider === "stripe" && <Loader2 className="ml-auto size-4 animate-spin" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
