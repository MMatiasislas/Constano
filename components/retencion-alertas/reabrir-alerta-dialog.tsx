"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcwIcon } from "lucide-react";

import { reopenAlert } from "@/app/(dashboard)/dashboard/retencion/actions";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ReabrirAlertaDialog({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleReopen() {
    setLoading(true);
    const result = await reopenAlert(alertId);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos reabrir la alerta", { description: result.error });
      return;
    }

    toast.success("Alerta reabierta");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        <RotateCcwIcon />
        Reabrir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Reabrir esta alerta?</AlertDialogTitle>
          <AlertDialogDescription>
            Vuelve a quedar activa, como si el alumno siguiera sin venir. Se borra el motivo y la
            nota de resolución.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleReopen} disabled={loading}>
            {loading ? "Reabriendo..." : "Reabrir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
