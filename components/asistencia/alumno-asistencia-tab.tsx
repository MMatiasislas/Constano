"use client";

import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { cn } from "@/lib/utils";
import {
  calcularAsistenciasMes,
  calcularAsistenciasSemana,
  formatearHoraCheckIn,
  getMonthCalendar,
  ultimaAsistenciaTexto,
} from "@/lib/attendance";
import { MESES } from "@/types/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AttendanceWithCheckedBy } from "@/types/db";

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];
const PAGE_SIZE = 20;

function capitalizar(texto: string) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function AlumnoAsistenciaTab({
  attendances,
  weeklyFrequency,
}: {
  attendances: AttendanceWithCheckedBy[];
  weeklyFrequency: number | null;
}) {
  const hoy = new Date();
  const [viewedMonth, setViewedMonth] = useState(hoy.getMonth() + 1);
  const [viewedYear, setViewedYear] = useState(hoy.getFullYear());
  const [pagina, setPagina] = useState(1);

  function goToPrevMonth() {
    if (viewedMonth === 1) {
      setViewedMonth(12);
      setViewedYear((year) => year - 1);
    } else {
      setViewedMonth((month) => month - 1);
    }
  }

  function goToNextMonth() {
    if (viewedMonth === 12) {
      setViewedMonth(1);
      setViewedYear((year) => year + 1);
    } else {
      setViewedMonth((month) => month + 1);
    }
  }

  const asistenciasEsteMes = calcularAsistenciasMes(attendances, hoy.getMonth() + 1, hoy.getFullYear());
  const asistenciasEstaSemana = calcularAsistenciasSemana(attendances);
  const ultimaAsistencia = ultimaAsistenciaTexto(attendances);
  const cumpleFrecuencia = weeklyFrequency ? asistenciasEstaSemana >= weeklyFrequency : null;

  const calendario = getMonthCalendar(viewedMonth, viewedYear, attendances);

  const totalPaginas = Math.max(1, Math.ceil(attendances.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const historialPagina = attendances.slice(
    (paginaActual - 1) * PAGE_SIZE,
    paginaActual * PAGE_SIZE
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-3">
        <MetricCard label="Asistencias este mes" value={String(asistenciasEsteMes)} />
        <MetricCard label="Esta semana" value={String(asistenciasEstaSemana)} />
        <Card>
          <CardContent className="flex flex-col gap-1 py-4">
            <span className="text-xs text-muted-foreground">Frecuencia</span>
            <span className="text-sm text-foreground">
              Contratada: {weeklyFrequency ? `${weeklyFrequency}x/sem` : "Libre"}
            </span>
            <span className="text-sm text-foreground">Actual: {asistenciasEstaSemana}x/sem</span>
            {cumpleFrecuencia !== null && (
              <Badge
                variant="outline"
                className={cn(
                  "w-fit",
                  cumpleFrecuencia
                    ? "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                    : "border-transparent bg-red-500/15 text-red-700 dark:text-red-400"
                )}
              >
                {cumpleFrecuencia ? "Cumple" : "Por debajo"}
              </Badge>
            )}
          </CardContent>
        </Card>
        <MetricCard
          label="Última asistencia"
          value={ultimaAsistencia ? capitalizar(ultimaAsistencia) : "Sin registros"}
        />
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 py-4">
          <div className="flex items-center justify-between">
            <Button variant="outline" size="icon-sm" onClick={goToPrevMonth}>
              <ChevronLeftIcon />
              <span className="sr-only">Mes anterior</span>
            </Button>
            <span className="text-sm font-medium text-foreground">
              {MESES[viewedMonth - 1]} {viewedYear}
            </span>
            <Button variant="outline" size="icon-sm" onClick={goToNextMonth}>
              <ChevronRightIcon />
              <span className="sr-only">Mes siguiente</span>
            </Button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {DIAS_SEMANA.map((dia, index) => (
              <span key={index}>{dia}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendario.map((day, index) =>
              day === null ? (
                <div key={index} />
              ) : (
                <div
                  key={index}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-sm",
                    day.hasAttendance
                      ? "bg-emerald-500/20 font-medium text-emerald-700 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground",
                    day.isToday && "ring-2 ring-ring"
                  )}
                >
                  {day.dayNumber}
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 lg:col-span-2">
        <h3 className="text-base font-medium text-foreground">Historial de asistencias</h3>
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Hora</TableHead>
                <TableHead>Marcado por</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historialPagina.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Todavía no hay asistencias registradas.
                  </TableCell>
                </TableRow>
              ) : (
                historialPagina.map((attendance) => {
                  const fecha = new Date(attendance.checked_in_at);
                  return (
                    <TableRow key={attendance.id}>
                      <TableCell>{format(fecha, "dd/MM/yyyy")}</TableCell>
                      <TableCell className="capitalize">
                        {format(fecha, "EEE", { locale: es })}
                      </TableCell>
                      <TableCell>{formatearHoraCheckIn(attendance.checked_in_at)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {attendance.checked_in_by_user?.email ?? "—"}
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
              Página {paginaActual} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={paginaActual <= 1}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={paginaActual >= totalPaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xl font-semibold text-foreground">{value}</span>
      </CardContent>
    </Card>
  );
}
