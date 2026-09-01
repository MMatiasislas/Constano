"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

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

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Ingresá tu email").email("Ingresá un email válido"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordValues) {
    setLoading(true);
    const supabase = createClient();

    // No se distingue en la UI si el email existe o no (mismo mensaje de
    // éxito siempre) — práctica estándar para no filtrar qué emails están
    // registrados. Un error acá casi siempre es de red/rate-limit, no de
    // "el email no existe" (Supabase no lo reporta como error por diseño).
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      toast.error("No pudimos enviar el email", { description: error.message });
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <p className="font-medium text-foreground">Revisá tu email</p>
          <p className="text-sm text-muted-foreground">
            Si existe una cuenta con ese email, te mandamos un link para elegir una contraseña
            nueva.
          </p>
          <Link href="/login" className="mt-2 text-sm font-medium text-foreground hover:underline">
            Volver a iniciar sesión
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <span className="text-lg font-semibold tracking-tight">Constano</span>
        <CardTitle className="text-xl">¿Olvidaste tu contraseña?</CardTitle>
        <CardDescription>
          Ingresá tu email y te mandamos un link para elegir una nueva.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="vos@tugimnasio.com"
                      autoComplete="email"
                      autoFocus
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="mt-2 flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-foreground hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
