"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { verifyKioskPinAction } from "@/app/checkin/[gymSlug]/actions";
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

export function SalirKioscoDialog({
  gymSlug,
  hasActiveSession,
}: {
  gymSlug: string;
  hasActiveSession: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPin("");
      setError(null);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const { valid } = await verifyKioskPinAction(gymSlug, pin);
    setLoading(false);

    if (!valid) {
      setError("PIN incorrecto");
      return;
    }

    router.push(hasActiveSession ? "/dashboard/asistencia" : "/login");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}>
        Salir
      </DialogTrigger>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Salir del modo kiosco</DialogTitle>
          <DialogDescription>Ingresá el PIN de 4 dígitos configurado por el gimnasio.</DialogDescription>
        </DialogHeader>
        <Input
          type="text"
          inputMode="numeric"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className="text-center text-lg tracking-[0.5em]"
          autoFocus
        />
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button onClick={handleSubmit} disabled={pin.length !== 4 || loading}>
            {loading ? "Verificando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
