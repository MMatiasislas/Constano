import { AlertTriangle, Check, Dumbbell, QrCode, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Rutinas profesionales",
    description:
      "Armá rutinas mensuales con biblioteca de ejercicios, plantillas reutilizables y exportación a PDF con tu logo.",
    bullets: [
      "Biblioteca con más de 75 ejercicios precargados, agrupados por grupo muscular",
      "Plantillas reutilizables: armá una vez, asigná a todos tus alumnos",
      "Exportación a PDF con el logo de tu gimnasio, lista para imprimir o mandar por WhatsApp",
    ],
    bar: "bg-brand-500",
    iconWrap: "bg-brand-500/10 text-brand-600 dark:text-brand-400",
    hoverBorder: "hover:border-brand-500/40",
    hoverShadow: "hover:shadow-brand-500/10",
  },
  {
    icon: AlertTriangle,
    title: "Alertas de retención",
    description:
      "El sistema te avisa qué alumnos están en riesgo, con acceso directo a WhatsApp para contactarlos.",
    bullets: [
      "Reglas configurables: elegís cuántos días sin venir disparan una alerta",
      "Panel priorizado con los alumnos en mayor riesgo primero",
      "Botón directo a WhatsApp con mensaje personalizable ya escrito",
    ],
    bar: "bg-amber-500",
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-500/10",
  },
  {
    icon: QrCode,
    title: "Check-in sin fricción",
    description: "Tus alumnos marcan su propia asistencia con QR. Vos solo mirás quién vino.",
    bullets: [
      "Cada alumno tiene su propio código QR para marcar entrada solo",
      "Modo kiosco en una tablet, sin que el encargado tenga que estar pendiente",
      "El check-in manual sigue disponible como respaldo",
    ],
    bar: "bg-emerald-500",
    iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/40",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
  {
    icon: Wallet,
    title: "Control de pagos",
    description: "Sabé quién está al día y quién debe, sin planillas ni Excel.",
    bullets: [
      "Vencimientos automáticos según el plan de cada alumno",
      "Panel de deudores y alumnos por vencer, organizado y a la vista",
      "Un click para cobrar y renovar el plan al mismo tiempo",
    ],
    bar: "bg-sky-500",
    iconWrap: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    hoverBorder: "hover:border-sky-500/40",
    hoverShadow: "hover:shadow-sky-500/10",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="caracteristicas"
      className="relative scroll-mt-20 overflow-hidden bg-muted/40 px-4 py-20 sm:px-6 sm:py-28"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_15%,black,transparent)]"
      />

      <div className="relative mx-auto max-w-5xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitás para retener alumnos
          </h2>
        </RevealOnScroll>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature, i) => (
            <RevealOnScroll key={feature.title} delayMs={i * 100} className="h-full">
              <div
                className={cn(
                  "group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl sm:p-8",
                  feature.hoverBorder,
                  feature.hoverShadow
                )}
              >
                <span aria-hidden className={cn("absolute inset-x-0 top-0 h-1", feature.bar)} />
                <span
                  className={cn(
                    "flex size-14 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-110",
                    feature.iconWrap
                  )}
                >
                  <feature.icon className="size-7" strokeWidth={2} />
                </span>
                <div className="flex flex-col gap-1.5">
                  <h3 className="font-heading text-lg font-bold">{feature.title}</h3>
                  <p className="text-sm text-pretty text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
                <ul className="mt-1 flex flex-col gap-2.5 border-t border-border/70 pt-4">
                  {feature.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand-500" strokeWidth={2.5} />
                      <span className="text-sm text-pretty text-foreground/90">{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
