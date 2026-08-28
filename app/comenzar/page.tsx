"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Dumbbell } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { createLead } from "./actions";
import { leadSchema, type LeadValues } from "@/lib/validations/lead";
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

// Página pública, fuera de (auth) y (dashboard) a propósito — se interpone
// entre la landing y /signup, y necesita el mismo look oscuro del hero de
// marketing (no el layout centrado/claro de (auth)). Ver CLAUDE.md, sección
// "Captura de leads (/comenzar)".
export default function ComenzarPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { gym_name: "", email: "", phone: "" },
  });

  async function onSubmit(values: LeadValues) {
    setLoading(true);
    const result = await createLead(values);
    // Si `createLead` redirige (caso feliz), esta línea nunca se ejecuta —
    // Next corta la ejecución del cliente y navega. Solo llegamos acá si
    // devolvió un error.
    if (result?.error) {
      toast.error("No pudimos guardar tus datos", { description: result.error });
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-hidden bg-neutral-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]"
      />

      <header className="relative px-4 py-6 sm:px-6">
        <Link href="/" className="flex w-fit items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="flex size-7 items-center justify-center rounded-md bg-brand-500 text-white">
            <Dumbbell className="size-4" />
          </span>
          Constano
        </Link>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-md">
          <div className="mb-8 flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">
              Antes de arrancar, contanos un poco de tu gimnasio
            </h1>
            <p className="text-white/70">
              Así podemos ayudarte mejor si necesitás una mano con la configuración.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 backdrop-blur sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="gym_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Nombre del gimnasio</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Iron Gym"
                          autoComplete="organization"
                          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="vos@tugimnasio.com"
                          autoComplete="email"
                          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Así te podemos contactar si necesitás ayuda"
                          autoComplete="tel"
                          className="border-white/15 bg-white/5 text-white placeholder:text-white/40"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="mt-2 h-12 bg-brand-500 text-base text-white hover:bg-brand-600"
                >
                  {loading ? "Guardando..." : "Continuar"}
                  {!loading && <ArrowRight />}
                </Button>
              </form>
            </Form>
          </div>

          <p className="mt-6 text-center text-xs text-white/40">Sin tarjeta de crédito</p>
        </div>
      </main>
    </div>
  );
}
