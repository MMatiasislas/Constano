import Link from "next/link";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutCanceladoPage() {
  return (
    <div className="flex flex-1 items-center justify-center py-12">
      <Card className="max-w-md">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <XCircle className="size-12 text-muted-foreground" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight">El pago fue cancelado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              No te cobramos nada. Cuando quieras, podés volver a intentarlo.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/dashboard/configuracion/suscripcion" />}>
            Volver a intentar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
