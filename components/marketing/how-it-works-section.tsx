import { RevealOnScroll } from "./reveal-on-scroll";

const STEPS = [
  {
    number: "01",
    title: "Creá tu cuenta",
    description:
      "2 minutos, gratis. Completás el nombre de tu gimnasio y tu mail, y ya tenés acceso completo al sistema.",
    badge: "Gratis, sin tarjeta",
  },
  {
    number: "02",
    title: "Cargá tus alumnos",
    description:
      "Importalos todos de una con Excel, o cargalos de a uno. No perdés ningún dato.",
    badge: "Importación masiva disponible",
  },
  {
    number: "03",
    title: "Empezá a retener",
    description:
      "Con tus alumnos y rutinas cargadas, ya podés ver quién viene, cobrar cuotas, y recibir alertas de quién está por irse.",
    badge: "Operativo desde el día 1",
  },
];

export function HowItWorksSection() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-background px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <RevealOnScroll className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold tracking-widest text-brand-600 uppercase">
            Primeros pasos
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            Tu sistema en marcha hoy mismo
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-pretty">
            Setup en minutos. Sin curva de aprendizaje complicada.
          </p>
        </RevealOnScroll>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <RevealOnScroll key={step.number} delayMs={i * 120} className="h-full">
              <div className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-card p-7 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg">
                <span
                  aria-hidden
                  className="font-heading text-6xl leading-none font-black tracking-tight text-brand-200"
                >
                  {step.number}
                </span>
                <h3 className="font-heading mt-2 text-lg font-bold">{step.title}</h3>
                <p className="text-sm text-pretty text-muted-foreground">{step.description}</p>
                <span className="mt-auto w-fit rounded-full bg-brand-200/50 px-3 py-1 text-xs font-medium text-brand-600">
                  {step.badge}
                </span>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
