"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { acceptInvitationSchema, type AcceptInvitationValues } from "@/lib/validations/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export function AceptarInvitacionForm({ token, email }: { token: string; email: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<AcceptInvitationValues>({
    resolver: zodResolver(acceptInvitationSchema),
    defaultValues: { full_name: "", password: "", confirm_password: "" },
  });

  async function onSubmit(values: AcceptInvitationValues) {
    setLoading(true);
    const supabase = createClient();

    // El trigger de signup (handle_new_user, ver
    // supabase/migrations/012_team_invitations.sql) lee `invitation_token`
    // de estos metadata: si encuentra una invitación pendiente y vigente
    // con ese token, une al usuario al gym de la invitación como 'staff'
    // (en vez del comportamiento normal de crear un gym nuevo como
    // 'owner') y marca la invitación como 'accepted'.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
          invitation_token: token,
        },
      },
    });

    if (error) {
      const description =
        error.message === "User already registered"
          ? "Ya existe una cuenta con ese email. Iniciá sesión en vez de crear una nueva."
          : error.message.toLowerCase().includes("password")
            ? "La contraseña es demasiado débil. Probá con una más segura."
            : error.message;

      toast.error("No pudimos crear tu cuenta", { description });
      setLoading(false);
      return;
    }

    if (!data.user) {
      toast.error("No pudimos crear tu cuenta", {
        description: "Intentá de nuevo en unos minutos.",
      });
      setLoading(false);
      return;
    }

    if (!data.session) {
      toast.success("¡Cuenta creada!", {
        description: "Confirmá tu email y después iniciá sesión para entrar al dashboard.",
      });
      setLoading(false);
      router.push("/login");
      return;
    }

    toast.success("¡Listo! Ya sos parte del equipo.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Email</span>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            {email}
          </p>
        </div>
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirm_password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirmar contraseña</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="Repetila"
                  autoComplete="new-password"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="mt-2 w-full" disabled={loading}>
          {loading ? "Creando cuenta..." : "Crear mi cuenta"}
        </Button>
      </form>
    </Form>
  );
}
