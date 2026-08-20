import Link from "next/link";
import { ChevronRightIcon, PlusIcon, UsersIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlumnosFiltros } from "@/components/alumnos/alumnos-filtros";
import type { Member, MemberStatus } from "@/types/db";

const PAGE_SIZE = 20;

const ESTADOS_VALIDOS: MemberStatus[] = ["active", "paused", "inactive"];

const ESTADO_BADGE: Record<MemberStatus, { label: string; className: string }> = {
  active: {
    label: "Activo",
    className: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  },
  paused: {
    label: "Pausado",
    className: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
  inactive: {
    label: "Inactivo",
    className: "border-transparent bg-muted text-muted-foreground",
  },
};

function escapeForOr(value: string) {
  return value.replace(/[%,()]/g, (char) => `\\${char}`);
}

function getInitials(firstName: string, lastName: string | null) {
  const first = firstName.trim()[0] ?? "";
  const last = lastName?.trim()[0] ?? "";
  return `${first}${last}`.toUpperCase() || "?";
}

function frecuenciaLabel(frequency: number | null) {
  return frequency ? `${frequency}x/sem` : "Libre";
}

type PageProps = {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
};

export default async function AlumnosPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const estado = ESTADOS_VALIDOS.includes(params.estado as MemberStatus)
    ? (params.estado as MemberStatus)
    : undefined;
  const pagina = Math.max(1, Number(params.pagina) || 1);
  const from = (pagina - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  let query = supabase
    .from("members")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (estado) {
    query = query.eq("status", estado);
  }
  if (q) {
    const safeQ = escapeForOr(q);
    query = query.or(
      `first_name.ilike.%${safeQ}%,last_name.ilike.%${safeQ}%,phone.ilike.%${safeQ}%`
    );
  }

  const [{ data: members, count }, { count: activeCount }, { count: totalCount }] =
    await Promise.all([
      query,
      supabase.from("members").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("members").select("*", { count: "exact", head: true }),
    ]);

  const alumnos = (members ?? []) as Member[];
  const totalFiltrados = count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalFiltrados / PAGE_SIZE));

  function hrefConPagina(nuevaPagina: number) {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (estado) next.set("estado", estado);
    if (nuevaPagina > 1) next.set("pagina", String(nuevaPagina));
    const qs = next.toString();
    return qs ? `/dashboard/alumnos?${qs}` : "/dashboard/alumnos";
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alumnos</h1>
          <p className="text-muted-foreground">
            {activeCount ?? 0} alumnos activos de {totalCount ?? 0} totales
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/dashboard/alumnos/nuevo" />}>
          <PlusIcon />
          Nuevo alumno
        </Button>
      </div>

      {(totalCount ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <UsersIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Todavía no tenés alumnos cargados</p>
            <Button nativeButton={false} render={<Link href="/dashboard/alumnos/nuevo" />}>
              Cargar el primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <AlumnosFiltros />

          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Alta</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alumnos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No encontramos alumnos con esos filtros.
                    </TableCell>
                  </TableRow>
                ) : (
                  alumnos.map((alumno) => {
                    const nombreCompleto = [alumno.first_name, alumno.last_name]
                      .filter(Boolean)
                      .join(" ");
                    const badge = ESTADO_BADGE[alumno.status];

                    return (
                      <TableRow key={alumno.id} className="relative">
                        <TableCell>
                          <Avatar size="sm">
                            {alumno.photo_url && (
                              <AvatarImage src={alumno.photo_url} alt={nombreCompleto} />
                            )}
                            <AvatarFallback>
                              {getInitials(alumno.first_name, alumno.last_name)}
                            </AvatarFallback>
                          </Avatar>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {nombreCompleto}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alumno.phone || "—"}
                        </TableCell>
                        <TableCell>{frecuenciaLabel(alumno.weekly_frequency)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(badge.className)}>
                            {badge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(alumno.joined_at), "dd/MM/yyyy", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/dashboard/alumnos/${alumno.id}`}
                            className="flex items-center justify-end after:absolute after:inset-0"
                          >
                            <span className="sr-only">Ver</span>
                            <ChevronRightIcon className="size-4 text-muted-foreground" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>

          {totalPaginas > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Página {pagina} de {totalPaginas}
              </p>
              <div className="flex gap-2">
                {pagina > 1 ? (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={hrefConPagina(pagina - 1)} />}
                  >
                    Anterior
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                )}
                {pagina < totalPaginas ? (
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={hrefConPagina(pagina + 1)} />}
                  >
                    Siguiente
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Siguiente
                  </Button>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
