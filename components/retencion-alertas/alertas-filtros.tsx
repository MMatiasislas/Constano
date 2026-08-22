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
  { value: "abiertas", label: "Abiertas (activas + contactadas)" },
  { value: "active", label: "Solo activas" },
  { value: "contacted", label: "Solo contactadas" },
  { value: "resolved", label: "Resueltas" },
  { value: "dismissed", label: "Descartadas" },
  { value: "todas", label: "Todas" },
];

const ESTADOS_ITEMS = Object.fromEntries(ESTADOS.map((estado) => [estado.value, estado.label]));

export function AlertasFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 sm:max-w-xs">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre..."
          className="pl-8"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
        />
      </div>
      <Select
        items={ESTADOS_ITEMS}
        value={searchParams.get("estado") ?? "abiertas"}
        onValueChange={(value) =>
          updateParams({ estado: value === "abiertas" ? null : value })
        }
      >
        <SelectTrigger className="w-full sm:w-64">
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
