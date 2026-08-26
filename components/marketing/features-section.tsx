import { AlertTriangle, Dumbbell, QrCode, Wallet } from "lucide-react";

import { cn } from "@/lib/utils";
import { RevealOnScroll } from "./reveal-on-scroll";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Rutinas profesionales",
    description:
      "Armá rutinas mensuales con biblioteca de ejercicios, plantillas reutilizables y exportación a PDF con tu logo.",
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
    bar: "bg-amber-500",
    iconWrap: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    hoverBorder: "hover:border-amber-500/40",
    hoverShadow: "hover:shadow-amber-500/10",
  },
  {
    icon: QrCode,
    title: "Check-in sin fricción",
    description: "Tus alumnos marcan su propia asistencia con QR. Vos solo mirás quién vino.",
    bar: "bg-emerald-500",
    iconWrap: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    hoverBorder: "hover:border-emerald-500/40",
    hoverShadow: "hover:shadow-emerald-500/10",
  },
  {
    icon: Wallet,
    title: "Control de pagos",
    description: "Sabé quién está al día y quién debe, sin planillas ni Excel.",
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

      <div className="relative mx-auto max-w-6xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitás para retener alumnos
          </h2>
        </RevealOnScroll>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <RevealOnScroll key={feature.title} delayMs={i * 100} className="h-full">
              <div
                className={cn(
                  "group relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl",
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
                <h3 className="font-heading text-lg font-bold">{feature.title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{feature.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
