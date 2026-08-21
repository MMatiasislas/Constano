"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";

export function PlantillasFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (busqueda === currentQ) return;

    const timeout = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (busqueda) {
        next.set("q", busqueda);
      } else {
        next.delete("q");
      }
      const qs = next.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname);
      });
    }, 350);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  return (
    <div className="relative sm:max-w-xs">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Buscar plantilla..."
        className="pl-8"
        value={busqueda}
        onChange={(event) => setBusqueda(event.target.value)}
      />
    </div>
  );
}
