"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MUSCLE_GROUPS } from "@/types/db";

const GRUPO_ITEMS = {
  todos: "Todos",
  ...Object.fromEntries(MUSCLE_GROUPS.map((group) => [group, group])),
};

export function EjerciciosFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [busqueda, setBusqueda] = useState(searchParams.get("q") ?? "");
  const soloPersonalizados = searchParams.get("personalizados") === "1";

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ejercicio..."
            className="pl-8"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
          />
        </div>
        <Select
          items={GRUPO_ITEMS}
          value={searchParams.get("grupo") ?? "todos"}
          onValueChange={(value) => updateParams({ grupo: value === "todos" ? null : value })}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {MUSCLE_GROUPS.map((group) => (
              <SelectItem key={group} value={group}>
                {group}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="inline-flex w-fit rounded-lg border border-input p-0.5">
        <Button
          type="button"
          variant={soloPersonalizados ? "ghost" : "secondary"}
          size="sm"
          onClick={() => updateParams({ personalizados: null })}
        >
          Todos
        </Button>
        <Button
          type="button"
          variant={soloPersonalizados ? "secondary" : "ghost"}
          size="sm"
          onClick={() => updateParams({ personalizados: "1" })}
        >
          Solo personalizados
        </Button>
      </div>
    </div>
  );
}
