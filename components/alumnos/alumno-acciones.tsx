"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDownIcon, PauseIcon, PlayIcon, UserXIcon } from "lucide-react";

import { updateMemberStatus } from "@/app/(dashboard)/dashboard/alumnos/[id]/actions";
import { nombreCompleto } from "@/lib/members";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Member } from "@/types/db";

type ConfirmDialog = "toggle" | "baja" | null;

export function AlumnoAcciones({ member }: { member: Member }) {
  const router = useRouter();
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>(null);
  const [loading, setLoading] = useState(false);

  const nombre = nombreCompleto(member.first_name, member.last_name);
  const vaAPausar = member.status === "active";
  const vaADarDeBaja = member.status !== "inactive";

  async function confirmarToggle() {
    setLoading(true);
    const result = await updateMemberStatus(member.id, vaAPausar ? "paused" : "active");
    setLoading(false);
    setConfirmDialog(null);

    if (result?.error) {
      toast.error("No pudimos actualizar el estado", { description: result.error });
      return;
    }

    toast.success(vaAPausar ? "Alumno pausado" : "Alumno reactivado");
    router.refresh();
  }

  async function confirmarBaja() {
    setLoading(true);
    const result = await updateMemberStatus(member.id, "inactive");
    setLoading(false);
    setConfirmDialog(null);

    if (result?.error) {
      toast.error("No pudimos dar de baja al alumno", { description: result.error });
      return;
    }

    toast.success("Alumno dado de baja");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" />}>
          Más acciones
          <ChevronDownIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setConfirmDialog("toggle")}>
            {vaAPausar ? <PauseIcon /> : <PlayIcon />}
            {vaAPausar ? "Pausar" : "Reactivar"}
          </DropdownMenuItem>
          {vaADarDeBaja && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setConfirmDialog("baja")}
              >
                <UserXIcon />
                Dar de baja
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmDialog === "toggle"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {vaAPausar ? `¿Pausar a ${nombre}?` : `¿Reactivar a ${nombre}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {vaAPausar
                ? "Podés reactivarlo cuando quiera volver."
                : "Va a volver a aparecer como activo en el listado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarToggle} disabled={loading}>
              {loading ? "Guardando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDialog === "baja"}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja a {nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Va a aparecer como inactivo y no lo vas a ver en las listas por default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarBaja}
              disabled={loading}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {loading ? "Guardando..." : "Dar de baja"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
