import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Trash2Icon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamMember } from "@/types/db";

const ROLE_LABEL: Record<TeamMember["role"], string> = {
  owner: "Dueño",
  staff: "Staff",
};

// Server Component a propósito: la única "interacción" es un botón
// deshabilitado con un `title` nativo como tooltip (no hay componente
// Tooltip en el proyecto — mismo criterio ya documentado en CLAUDE.md para
// "Duplicar"/"Exportar PDF" de rutinas), así que no hace falta "use client"
// acá.
export function MiembrosTable({
  members,
  currentUserId,
}: {
  members: TeamMember[];
  currentUserId: string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Miembro desde</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => {
          const isSelf = member.id === currentUserId;

          return (
            <TableRow key={member.id}>
              <TableCell className="font-medium text-foreground">
                {member.full_name || "—"}
                {isSelf && <span className="ml-1.5 text-xs text-muted-foreground">(vos)</span>}
              </TableCell>
              <TableCell className="text-muted-foreground">{member.email}</TableCell>
              <TableCell>
                <Badge variant={member.role === "owner" ? "default" : "secondary"}>
                  {ROLE_LABEL[member.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(member.created_at), "d 'de' MMMM 'de' yyyy", { locale: es })}
              </TableCell>
              <TableCell className="text-right">
                {member.role !== "owner" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled
                    title="Próximamente"
                  >
                    <Trash2Icon />
                    <span className="sr-only">Eliminar del equipo (próximamente)</span>
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
