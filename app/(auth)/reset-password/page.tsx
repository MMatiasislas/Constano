"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// El link del email de recuperación (armado por
// `resetPasswordForEmail(email, { redirectTo: ".../reset-password" })` en
// /forgot-password) trae el token en la URL. El cliente de Supabase
// (`@supabase/ssr`, `detectSessionInUrl` activado por default) lo procesa
// solo al cargar la página y deja una sesión de recuperación temporal — no
// hace falta leer el token a mano acá, solo esperar a que
// `onAuthStateChange` avise que ya está lista (evento `PASSWORD_RECOVERY`)
// antes de mostrar el formulario, para no dejar completar la contraseña
// contra una sesión que todavía no existe.
type EstadoLink = "verificando" | "valido" | "invalido";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [estadoLink, setEstadoLink] = useState<EstadoLink>("verificando");

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setEstadoLink("valido");
      }
    });

    // Si la sesión de recuperación ya se había procesado antes de que este
    // efecto se suscribiera (carrera posible entre el detectSessionInUrl
    // del cliente y el montaje del componente), `onAuthStateChange` no la
    // vuelve a emitir — se chequea también con `getSession()` directo como
    // red de contención.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setEstadoLink((actual) => (actual === "verificando" ? "valido" : actual));
    });

    // Si a los pocos segundos no pasó nada, el link es viejo, ya usado, o
    // alguien entró directo a la URL sin pasar por el email.
    const timeout = setTimeout(() => {
      setEstadoLink((actual) => (actual === "verificando" ? "invalido" : actual));
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function onSubmit(values: ResetPasswordValues) {
    setLoading(true);
    const supabase = createClient();

    const { error } = await supabase.auth.updateUser({ password: values.password });

    if (error) {
      toast.error("No pudimos actualizar tu contraseña", { description: error.message });
      setLoading(false);
      return;
    }

    toast.success("Contraseña actualizada");
    router.push("/dashboard");
    router.refresh();
  }

  if (estadoLink === "verificando") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Verificando el link...
        </CardContent>
      </Card>
    );
  }

  if (estadoLink === "invalido") {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="font-medium text-foreground">Este link ya no es válido</p>
          <p className="text-sm text-muted-foreground">
            Puede haber expirado o ya haberse usado. Pedí uno nuevo.
          </p>
          <Link
            href="/forgot-password"
            className="mt-2 text-sm font-medium text-foreground hover:underline"
          >
            Volver a pedir el link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <span className="text-lg font-semibold tracking-tight">Constano</span>
        <CardTitle className="text-xl">Elegí una contraseña nueva</CardTitle>
        <CardDescription>Vas a poder usarla para iniciar sesión de ahora en más.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contraseña nueva</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
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
          </CardContent>
          <CardFooter className="mt-2">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Guardar contraseña"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
