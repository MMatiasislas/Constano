import { AlertTriangle, Dumbbell, QrCode, Wallet } from "lucide-react";

import { RevealOnScroll } from "./reveal-on-scroll";

const FEATURES = [
  {
    icon: Dumbbell,
    title: "Rutinas profesionales",
    description:
      "Armá rutinas mensuales con biblioteca de ejercicios, plantillas reutilizables y exportación a PDF con tu logo.",
  },
  {
    icon: AlertTriangle,
    title: "Alertas de retención",
    description:
      "El sistema te avisa qué alumnos están en riesgo, con acceso directo a WhatsApp para contactarlos.",
  },
  {
    icon: QrCode,
    title: "Check-in sin fricción",
    description: "Tus alumnos marcan su propia asistencia con QR. Vos solo mirás quién vino.",
  },
  {
    icon: Wallet,
    title: "Control de pagos",
    description: "Sabé quién está al día y quién debe, sin planillas ni Excel.",
  },
];

export function FeaturesSection() {
  return (
    <section id="caracteristicas" className="scroll-mt-20 bg-muted/40 px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Todo lo que necesitás para retener alumnos
          </h2>
        </RevealOnScroll>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, i) => (
            <RevealOnScroll key={feature.title} delayMs={i * 100}>
              <div className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="font-heading text-base font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
