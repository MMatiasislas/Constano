"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function AsistenciaFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");
  const verPausados = searchParams.get("pausados") === "1";

  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (busqueda === currentQ) return;

    const timeout = setTimeout(() => {
      updateParams({ q: busqueda || null });
    }, 350);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  function updateParams(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    const qs = next.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative sm:w-72">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          className="pl-8"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>
      <Label className="flex items-center gap-2 text-sm text-foreground">
        <Switch
          checked={verPausados}
          onCheckedChange={(checked) => updateParams({ pausados: checked ? "1" : null })}
        />
        Ver pausados también
      </Label>
    </div>
  );
}
