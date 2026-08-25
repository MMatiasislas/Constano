"use client";

import { useState } from "react";
import { toast } from "sonner";

import { setKioskPin } from "@/app/(dashboard)/dashboard/configuracion/kiosco/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function soloDigitos(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 4);
}

export function ConfigurarPinPrimeraVez({ onDone }: { onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (pin.length !== 4) {
      setError("El PIN tiene que ser de 4 números.");
      return;
    }
    if (pin !== confirmPin) {
      setError("Los dos PIN no coinciden.");
      return;
    }

    setLoading(true);
    const result = await setKioskPin(pin);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    toast.success("PIN configurado");
    onDone();
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-border p-6 text-center">
      <p className="text-lg font-medium text-foreground">Configurá un PIN de 4 dígitos</p>
      <p className="text-sm text-muted-foreground">
        Lo vas a necesitar para poder salir de esta pantalla después.
      </p>
      <Input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(soloDigitos(e.target.value))}
        placeholder="Nuevo PIN"
        className="text-center text-lg tracking-[0.5em]"
        autoFocus
      />
      <Input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={confirmPin}
        onChange={(e) => setConfirmPin(soloDigitos(e.target.value))}
        placeholder="Repetir PIN"
        className="text-center text-lg tracking-[0.5em]"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <Button onClick={handleSubmit} disabled={loading}>
        {loading ? "Guardando..." : "Activar modo kiosco"}
      </Button>
    </div>
  );
}
