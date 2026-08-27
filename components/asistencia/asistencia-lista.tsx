"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon } from "lucide-react";

import { markAttendance, unmarkAttendance } from "@/app/(dashboard)/dashboard/asistencia/actions";
import {
  isSubscriptionSuspendedError,
  notifySubscriptionSuspended,
} from "@/components/suscripcion/subscription-toast";
import { formatearHoraCheckIn } from "@/lib/attendance";
import { cn } from "@/lib/utils";
import { ESTADO_BADGE, frecuenciaLabel, getInitials, nombreCompleto } from "@/lib/members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { MemberStatus, MemberWithTodayAttendance } from "@/types/db";

type Row = {
  id: string;
  first_name: string;
  last_name: string | null;
  photo_url: string | null;
  weekly_frequency: number | null;
  status: MemberStatus;
  attendanceId: string | null;
  checkedInAt: string | null;
};

function toRows(members: MemberWithTodayAttendance[]): Row[] {
  return members.map((member) => {
    const attendance = member.attendances[0] ?? null;
    return {
      id: member.id,
      first_name: member.first_name,
      last_name: member.last_name,
      photo_url: member.photo_url,
      weekly_frequency: member.weekly_frequency,
      status: member.status,
      attendanceId: attendance?.id ?? null,
      checkedInAt: attendance?.checked_in_at ?? null,
    };
  });
}

function sortRows(rows: Row[]): Row[] {
  const presentes = [...rows]
    .filter((row) => row.checkedInAt)
    .sort((a, b) => (b.checkedInAt as string).localeCompare(a.checkedInAt as string));
  const pendientes = rows.filter((row) => !row.checkedInAt);
  return [...presentes, ...pendientes];
}

export function AsistenciaLista({ members }: { members: MemberWithTodayAttendance[] }) {
  const [prevMembers, setPrevMembers] = useState(members);
  const [rows, setRows] = useState<Row[]>(() => sortRows(toRows(members)));
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  if (members !== prevMembers) {
    setPrevMembers(members);
    setRows(sortRows(toRows(members)));
  }

  function setPending(id: string, pending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleUndo(memberId: string, attendanceId: string) {
    setRows((current) =>
      sortRows(
        current.map((row) =>
          row.id === memberId ? { ...row, checkedInAt: null, attendanceId: null } : row
        )
      )
    );

    const result = await unmarkAttendance(attendanceId);

    if (result?.error) {
      toast.error("No pudimos deshacer la asistencia", { description: result.error });
      return;
    }

    toast.success("Asistencia deshecha");
  }

  async function handleMark(memberId: string, nombre: string) {
    setPending(memberId, true);
    setRows((current) =>
      sortRows(
        current.map((row) =>
          row.id === memberId
            ? { ...row, checkedInAt: new Date().toISOString(), attendanceId: "optimistic" }
            : row
        )
      )
    );

    const result = await markAttendance(memberId);
    setPending(memberId, false);

    if ("error" in result) {
      setRows((current) =>
        sortRows(
          current.map((row) =>
            row.id === memberId ? { ...row, checkedInAt: null, attendanceId: null } : row
          )
        )
      );
      if (isSubscriptionSuspendedError(result.error)) {
        notifySubscriptionSuspended();
      } else {
        toast.error("No pudimos marcar la asistencia", { description: result.error });
      }
      return;
    }

    const { attendance } = result;
    setRows((current) =>
      sortRows(
        current.map((row) =>
          row.id === memberId
            ? { ...row, checkedInAt: attendance.checked_in_at, attendanceId: attendance.id }
            : row
        )
      )
    );

    toast.success(`Presente: ${nombre}`, {
      duration: 5000,
      action: {
        label: "Deshacer",
        onClick: () => handleUndo(memberId, attendance.id),
      },
    });
  }

  return (
    <div className="grid gap-2">
      {rows.map((row) => {
        const nombre = nombreCompleto(row.first_name, row.last_name);
        const pending = pendingIds.has(row.id);
        const presente = Boolean(row.checkedInAt);

        return (
          <Card key={row.id}>
            <CardContent className="flex items-center gap-3 py-3">
              <Avatar>
                {row.photo_url && <AvatarImage src={row.photo_url} alt={nombre} />}
                <AvatarFallback>{getInitials(row.first_name, row.last_name)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">{nombre}</span>
                  {row.status === "paused" && (
                    <Badge variant="outline" className={cn(ESTADO_BADGE.paused.className)}>
                      Pausado
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {frecuenciaLabel(row.weekly_frequency)}
                </span>
              </div>

              {!presente ? (
                <Button size="lg" disabled={pending} onClick={() => handleMark(row.id, nombre)}>
                  {pending ? "Marcando..." : "Marcar"}
                </Button>
              ) : pending ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-700 opacity-70 dark:text-emerald-400">
                  <CheckIcon className="size-4" />
                  Presente
                </span>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-700 outline-none transition-colors hover:bg-emerald-500/25 focus-visible:ring-3 focus-visible:ring-ring/50 dark:text-emerald-400"
                      />
                    }
                  >
                    <CheckIcon className="size-4" />
                    Presente {row.checkedInAt && formatearHoraCheckIn(row.checkedInAt)}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Deshacer asistencia de {nombre}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se va a borrar el registro de hoy. Podés volver a marcarlo cuando quieras.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          row.attendanceId && handleUndo(row.id, row.attendanceId)
                        }
                        className="bg-destructive/10 text-destructive hover:bg-destructive/20"
                      >
                        Deshacer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
