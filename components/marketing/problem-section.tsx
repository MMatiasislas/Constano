import { RevealOnScroll } from "./reveal-on-scroll";

export function ProblemSection() {
  return (
    <section className="bg-background px-4 py-20 sm:px-6 sm:py-28">
      <RevealOnScroll className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          Perder un alumno no avisa
        </h2>
        <p className="mt-5 text-lg text-muted-foreground text-pretty">
          Un alumno deja de venir de a poco. Primero falta una semana, después dos. Cuando te das
          cuenta, ya se dio de baja — y ni siquiera sabés por qué. Constano lo detecta antes que
          vos.
        </p>
      </RevealOnScroll>
    </section>
  );
}
