import { RevealOnScroll } from "./reveal-on-scroll";

const STEPS = [
  {
    title: "Cargá tus alumnos",
    description: "Importalos desde Excel o cargalos a mano en minutos.",
  },
  {
    title: "Armá sus rutinas",
    description: "Con biblioteca de ejercicios y plantillas reutilizables.",
  },
  {
    title: "Recibí alertas",
    description: "Enterate quién está por irse antes de que sea tarde.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-background px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Cómo funciona</h2>
        </RevealOnScroll>

        <div className="mt-16 grid gap-10 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step, i) => (
            <RevealOnScroll key={step.title} delayMs={i * 120} className="relative text-center">
              {i < STEPS.length - 1 && (
                <div
                  aria-hidden
                  className="absolute top-6 left-1/2 hidden h-px w-full bg-border sm:block"
                />
              )}
              <div className="relative mx-auto flex size-12 items-center justify-center rounded-full bg-orange-500 text-lg font-bold text-white">
                {i + 1}
              </div>
              <h3 className="font-heading mt-5 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
