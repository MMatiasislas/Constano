"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, XIcon } from "lucide-react";

import { cancelInvitation } from "@/app/(dashboard)/dashboard/configuracion/equipo/actions";
import { Button } from "@/components/ui/button";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamInvitation } from "@/types/db";

function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/invitacion/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copiado" : "Copiar link"}
    </Button>
  );
}

function CancelarInvitacionButton({ invitation }: { invitation: TeamInvitation }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    const result = await cancelInvitation(invitation.id);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos cancelar la invitación", { description: result.error });
      return;
    }

    toast.success("Invitación cancelada");
    router.refresh();
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="ghost" size="icon-sm" />}>
        <XIcon />
        <span className="sr-only">Cancelar invitación</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar la invitación a {invitation.email}?</AlertDialogTitle>
          <AlertDialogDescription>
            El link que le mandaste deja de funcionar. Vas a poder invitarlo de nuevo cuando
            quieras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Volver</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={loading}
            className="bg-destructive/10 text-destructive hover:bg-destructive/20"
          >
            {loading ? "Cancelando..." : "Cancelar invitación"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function InvitacionesTable({ invitations }: { invitations: TeamInvitation[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Vence</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invitations.map((invitation) => (
          <TableRow key={invitation.id}>
            <TableCell className="font-medium text-foreground">{invitation.email}</TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(invitation.expires_at), "d 'de' MMMM", { locale: es })}
            </TableCell>
            <TableCell className="flex justify-end gap-2">
              <CopyLinkButton token={invitation.token} />
              <CancelarInvitacionButton invitation={invitation} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
