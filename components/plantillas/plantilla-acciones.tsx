"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CopyIcon, MoreVerticalIcon, Trash2Icon } from "lucide-react";

import { deleteTemplate, duplicateTemplate } from "@/app/(dashboard)/dashboard/rutinas/plantillas/actions";
import {
  duplicateTemplateSchema,
  type DuplicateTemplateValues,
} from "@/lib/validations/routine-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import type { RoutineTemplate } from "@/types/db";

export function PlantillaAcciones({ template }: { template: RoutineTemplate }) {
  const router = useRouter();
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<DuplicateTemplateValues>({
    resolver: zodResolver(duplicateTemplateSchema),
    defaultValues: { name: `${template.name} - copia` },
  });

  function handleDuplicateOpenChange(nextOpen: boolean) {
    setDuplicateOpen(nextOpen);
    if (nextOpen) form.reset({ name: `${template.name} - copia` });
  }

  async function handleDuplicate(values: DuplicateTemplateValues) {
    setDuplicating(true);
    const result = await duplicateTemplate(template.id, values.name);
    setDuplicating(false);

    if (result?.error) {
      toast.error("No pudimos duplicar la plantilla", { description: result.error });
      return;
    }

    toast.success("Plantilla duplicada");
    setDuplicateOpen(false);
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteTemplate(template.id);
    setDeleting(false);
    setDeleteOpen(false);

    if (result?.error) {
      toast.error("No pudimos eliminar la plantilla", { description: result.error });
      return;
    }

    toast.success("Plantilla eliminada");
    router.refresh();
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
          <MoreVerticalIcon />
          <span className="sr-only">Más acciones</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDuplicateOpen(true)}>
            <CopyIcon />
            Duplicar plantilla
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2Icon />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={duplicateOpen} onOpenChange={handleDuplicateOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar plantilla</DialogTitle>
            <DialogDescription>
              Se va a crear una copia completa con sus días y ejercicios.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleDuplicate)} className="flex flex-col gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre de la nueva plantilla</FormLabel>
                    <FormControl>
                      <Input autoFocus {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose render={<Button type="button" variant="outline" />}>
                  Cancelar
                </DialogClose>
                <Button type="submit" disabled={duplicating}>
                  {duplicating ? "Duplicando..." : "Duplicar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar plantilla &quot;{template.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Se van a borrar sus días y ejercicios. Las rutinas ya asignadas a alumnos no se ven
              afectadas. No se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive/10 text-destructive hover:bg-destructive/20"
            >
              {deleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
