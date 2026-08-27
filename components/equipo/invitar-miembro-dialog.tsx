"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, UserPlusIcon } from "lucide-react";

import { inviteTeamMember } from "@/app/(dashboard)/dashboard/configuracion/equipo/actions";
import { inviteTeamMemberSchema, type InviteTeamMemberValues } from "@/lib/validations/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
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

export function InvitarMiembroDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<InviteTeamMemberValues>({
    resolver: zodResolver(inviteTeamMemberSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: InviteTeamMemberValues) {
    const result = await inviteTeamMember(values);

    if (result?.error) {
      toast.error("No pudimos invitar", { description: result.error });
      return;
    }

    setInvitationUrl(`${window.location.origin}/invitacion/${result.token}`);
    router.refresh();
  }

  async function handleCopy() {
    if (!invitationUrl) return;
    await navigator.clipboard.writeText(invitationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      // Se resetea recién al cerrar (no en el medio) para que no se vea el
      // formulario "parpadear" vacío antes de que se cierre la animación.
      setTimeout(() => {
        setInvitationUrl(null);
        setCopied(false);
        form.reset();
      }, 150);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon />
        Invitar miembro del equipo
      </DialogTrigger>
      <DialogContent>
        {invitationUrl ? (
          <>
            <DialogHeader>
              <DialogTitle>¡Invitación creada!</DialogTitle>
              <DialogDescription>
                Copiá este link y mandaselo a tu encargado por WhatsApp o email. Vale por 7 días.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
              <span className="flex-1 truncate text-sm text-foreground">{invitationUrl}</span>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <CheckIcon /> : <CopyIcon />}
                {copied ? "Copiado" : "Copiar"}
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Listo
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Invitar miembro del equipo</DialogTitle>
              <DialogDescription>
                Le vamos a generar un link de invitación para que se sume como staff de tu
                gimnasio.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="profe@ejemplo.com"
                          autoComplete="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Generando..." : "Generar invitación"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
