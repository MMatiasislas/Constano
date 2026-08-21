"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SearchIcon, UsersIcon } from "lucide-react";

import { assignTemplateToMembers } from "@/app/(dashboard)/dashboard/rutinas/plantillas/actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ESTADO_BADGE, nombreCompleto } from "@/lib/members";
import {
  assignTemplateFormSchema,
  type AssignTemplateFormValues,
} from "@/lib/validations/routine-template";
import { monthItems, monthOptions } from "@/lib/validations/routine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Member, MemberStatus, RoutineTemplate } from "@/types/db";

const ESTADO_FILTRO_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "paused", label: "Pausados" },
  { value: "inactive", label: "Inactivos" },
] as const;

const ESTADO_FILTRO_ITEMS = Object.fromEntries(
  ESTADO_FILTRO_OPTIONS.map((option) => [option.value, option.label])
);

export function AsignarPlantillaDialog({
  template,
  triggerSize = "default",
}: {
  template: RoutineTemplate;
  triggerSize?: "default" | "sm";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const hasFetchedRef = useRef(false);
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<AssignTemplateFormValues>({
    resolver: zodResolver(assignTemplateFormSchema),
    defaultValues: { title: template.name, month_number: "ninguno" },
  });

  useEffect(() => {
    if (!open || hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("members")
      .select("*")
      .order("first_name", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMembers((data ?? []) as Member[]);
        setLoadingMembers(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch("");
      setEstadoFiltro("todos");
      setSelectedIds(new Set());
      form.reset({ title: template.name, month_number: "ninguno" });
      return;
    }

    form.reset({ title: template.name, month_number: "ninguno" });
  }

  function toggleMember(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const filtered = members.filter((member) => {
    if (estadoFiltro !== "todos" && member.status !== (estadoFiltro as MemberStatus)) return false;
    if (search.trim()) {
      const nombre = nombreCompleto(member.first_name, member.last_name).toLowerCase();
      if (!nombre.includes(search.trim().toLowerCase())) return false;
    }
    return true;
  });

  async function handleSubmit(values: AssignTemplateFormValues) {
    if (selectedIds.size === 0) {
      toast.error("Elegí al menos un alumno");
      return;
    }

    setSubmitting(true);
    const result = await assignTemplateToMembers(template.id, Array.from(selectedIds), values);
    setSubmitting(false);

    if (result?.error) {
      toast.error("No pudimos asignar la plantilla", { description: result.error });
      return;
    }

    toast.success(`Plantilla asignada a ${result.count} ${result.count === 1 ? "alumno" : "alumnos"}`);
    handleOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size={triggerSize} />}>
        <UsersIcon />
        Asignar a alumnos
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar &quot;{template.name}&quot; a alumnos</DialogTitle>
          <DialogDescription>
            Se va a crear una rutina independiente (copia de esta plantilla) para cada alumno que
            elijas.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título de la rutina que se va a crear</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="month_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mes (opcional)</FormLabel>
                  <Select items={monthItems} value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {monthOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2 rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size} {selectedIds.size === 1 ? "alumno seleccionado" : "alumnos seleccionados"}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar alumno..."
                    className="pl-8"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <Select
                  items={ESTADO_FILTRO_ITEMS}
                  value={estadoFiltro}
                  onValueChange={(value) => value && setEstadoFiltro(value)}
                >
                  <SelectTrigger className="w-full sm:w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADO_FILTRO_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {loadingMembers ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Cargando alumnos...
                  </p>
                ) : filtered.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No encontramos alumnos con esos filtros.
                  </p>
                ) : (
                  filtered.map((member) => {
                    const nombre = nombreCompleto(member.first_name, member.last_name);
                    const badge = ESTADO_BADGE[member.status];
                    const checked = selectedIds.has(member.id);

                    return (
                      <label
                        key={member.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleMember(member.id)}
                        />
                        <span className="flex-1 truncate text-foreground">{nombre}</span>
                        <Badge variant="outline" className={cn("text-[10px]", badge.className)}>
                          {badge.label}
                        </Badge>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>
                Cancelar
              </DialogClose>
              <Button type="submit" disabled={submitting || selectedIds.size === 0}>
                {submitting
                  ? "Asignando..."
                  : `Asignar a ${selectedIds.size} ${selectedIds.size === 1 ? "alumno" : "alumnos"}`}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
