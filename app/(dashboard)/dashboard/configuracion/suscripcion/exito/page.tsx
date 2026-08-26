import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutExitoPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              ¡Listo! Tu plan está siendo procesado
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Puede tardar unos segundos en activarse mientras confirmamos el pago. No hace falta
              que hagas nada más — cuando se confirme, tu suscripción va a pasar a &ldquo;activa&rdquo;
              sola.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/dashboard/configuracion/suscripcion" />}>
            Volver a mi suscripción
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
