import Link from "next/link";

import { whatsappHref } from "@/lib/members";
import { WHATSAPP_PLACEHOLDER_NUMBER } from "@/lib/marketing";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./reveal-on-scroll";

const CUSTOM_PLAN_MESSAGE =
  "Hola! Mi gimnasio tiene más de 100 alumnos, quiero consultar por un plan a medida en Constano.";

export function PricingSection() {
  return (
    <section id="precios" className="scroll-mt-20 bg-muted/40 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-4xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Un plan simple para tu gimnasio
          </h2>
        </RevealOnScroll>

        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          <RevealOnScroll className="h-full">
            <div className="relative flex h-full flex-col gap-5 rounded-2xl border border-brand-500 bg-card p-6 shadow-lg shadow-brand-500/10">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white">
                Todo incluido
              </span>
              <div>
                <h3 className="font-heading text-lg font-semibold">Constano</h3>
                <p className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight">$30.000</span>
                  <span className="text-sm text-muted-foreground">/mes</span>
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Hasta 100 alumnos. Todo incluido.
                </p>
              </div>
              <Button
                nativeButton={false}
                render={<Link href="/comenzar" />}
                className="mt-auto bg-brand-500 text-white hover:bg-brand-600"
              >
                Empezar gratis
              </Button>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delayMs={100} className="h-full">
            <div className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="font-heading text-lg font-semibold">¿Tu gimnasio es más grande?</h3>
                <p className="mt-3 text-sm text-pretty text-muted-foreground">
                  Armamos un plan a medida para gimnasios con más de 100 alumnos, cadenas o
                  necesidades especiales. Sin vueltas, hablamos y lo resolvemos.
                </p>
              </div>
              <Button
                variant="outline"
                className="mt-auto"
                nativeButton={false}
                render={
                  <a
                    href={whatsappHref(WHATSAPP_PLACEHOLDER_NUMBER, CUSTOM_PLAN_MESSAGE)}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Hablar por WhatsApp
              </Button>
            </div>
          </RevealOnScroll>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Los primeros 7 días son gratis. Sin tarjeta de crédito.
        </p>
      </div>
    </section>
  );
}
