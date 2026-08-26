import Link from "next/link";

import { whatsappHref } from "@/lib/members";
import { WHATSAPP_PLACEHOLDER_NUMBER } from "@/lib/marketing";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./reveal-on-scroll";

const PLANS = [
  { name: "Basic", price: "$30.000", limit: "Hasta 50 alumnos", highlighted: false },
  { name: "Pro", price: "$50.000", limit: "Hasta 100 alumnos", highlighted: true },
  { name: "Max", price: "$80.000", limit: "Hasta 200 alumnos", highlighted: false },
] as const;

// PLACEHOLDER: WHATSAPP_PLACEHOLDER_NUMBER (en lib/marketing.ts) es un número
// de ejemplo — reemplazarlo por el número real de WhatsApp de Constano antes
// de ir a producción.
const CUSTOM_PLAN_MESSAGE = "Hola! Quiero consultar por el plan Custom de Constano para mi gimnasio.";

export function PricingSection() {
  return (
    <section id="precios" className="scroll-mt-20 bg-muted/40 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Un plan para cada gimnasio
          </h2>
        </RevealOnScroll>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan, i) => (
            <RevealOnScroll key={plan.name} delayMs={i * 100} className="h-full">
              <div
                className={cn(
                  "relative flex h-full flex-col gap-5 rounded-2xl border bg-card p-6",
                  plan.highlighted
                    ? "border-brand-500 shadow-lg shadow-brand-500/10"
                    : "border-border"
                )}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold whitespace-nowrap text-white">
                    Más elegido
                  </span>
                )}
                <div>
                  <h3 className="font-heading text-lg font-semibold">{plan.name}</h3>
                  <p className="mt-3 flex items-baseline gap-1">
                    <span className="text-3xl font-bold tracking-tight">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/mes</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{plan.limit}</p>
                </div>
                <Button
                  nativeButton={false}
                  render={<Link href="/signup" />}
                  variant={plan.highlighted ? "default" : "outline"}
                  className={cn("mt-auto", plan.highlighted && "bg-brand-500 text-white hover:bg-brand-600")}
                >
                  Empezar gratis
                </Button>
              </div>
            </RevealOnScroll>
          ))}

          <RevealOnScroll delayMs={PLANS.length * 100} className="h-full">
            <div className="flex h-full flex-col gap-5 rounded-2xl border border-border bg-card p-6">
              <div>
                <h3 className="font-heading text-lg font-semibold">Custom</h3>
                <p className="mt-3 text-2xl font-bold tracking-tight text-balance">
                  Hablanos por WhatsApp
                </p>
                <p className="mt-2 text-sm text-muted-foreground">Más de 200 alumnos</p>
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
                Hablanos por WhatsApp
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
