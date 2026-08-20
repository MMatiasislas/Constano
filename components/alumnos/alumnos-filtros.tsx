"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADOS = [
  { value: "todos", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "paused", label: "Pausados" },
  { value: "inactive", label: "Inactivos" },
];

// Base UI's <Select.Value> necesita este mapa value -> label para mostrar
// el texto elegido; sin "items" muestra el value crudo (ver CLAUDE.md).
const ESTADOS_ITEMS = Object.fromEntries(ESTADOS.map((estado) => [estado.value, estado.label]));

export function AlumnosFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const currentQ = searchParams.get("q") ?? "";
    if (busqueda === currentQ) return;

    const timeout = setTimeout(() => {
      updateParams({ q: busqueda || null, pagina: null });
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o teléfono..."
          className="pl-8"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>
      <Select
        items={ESTADOS_ITEMS}
        value={searchParams.get("estado") ?? "todos"}
        onValueChange={(value) =>
          updateParams({ estado: value === "todos" ? null : value, pagina: null })
        }
      >
        <SelectTrigger className="w-full sm:w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ESTADOS.map((estado) => (
            <SelectItem key={estado.value} value={estado.value}>
              {estado.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
