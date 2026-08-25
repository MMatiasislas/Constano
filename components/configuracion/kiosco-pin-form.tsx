"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLinkIcon } from "lucide-react";

import { setKioskPin } from "@/app/(dashboard)/dashboard/configuracion/kiosco/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function soloDigitos(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 4);
}

export function KioscoPinForm({
  currentPin,
  gymSlug,
}: {
  currentPin: string | null;
  gymSlug: string;
}) {
  const [pin, setPin] = useState(currentPin ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (pin.length !== 4) {
      toast.error("El PIN tiene que ser de 4 números.");
      return;
    }

    setLoading(true);
    const result = await setKioskPin(pin);
    setLoading(false);

    if (result.error) {
      toast.error("No pudimos guardar el PIN", { description: result.error });
      return;
    }

    toast.success("PIN actualizado");
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 py-4">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:max-w-xs">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="kiosk-pin">PIN del kiosco</Label>
            <Input
              id="kiosk-pin"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(soloDigitos(e.target.value))}
              placeholder="0000"
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>
          <Button type="submit" disabled={loading || pin.length !== 4}>
            {loading ? "Guardando..." : "Guardar PIN"}
          </Button>
        </form>

        {gymSlug && (
          <Button
            variant="outline"
            className="w-fit"
            nativeButton={false}
            render={<a href={`/checkin/${gymSlug}`} target="_blank" rel="noopener noreferrer" />}
          >
            <ExternalLinkIcon />
            Abrir modo kiosco (QR)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
