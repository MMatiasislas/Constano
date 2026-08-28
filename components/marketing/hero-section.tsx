import Link from "next/link";
import { AlertTriangle, ArrowRight, QrCode, TrendingUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./reveal-on-scroll";

const BAR_HEIGHTS = [40, 65, 50, 80, 60, 95, 70];

function HeroMock() {
  return (
    <div className="relative mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/40 backdrop-blur">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white/80">Asistencia semanal</span>
        <TrendingUp className="size-4 text-brand-400" />
      </div>
      <div className="mt-4 flex h-24 items-end gap-2">
        {BAR_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-brand-400"
            style={{ height: `${h}%`, opacity: 0.45 + (h / 100) * 0.55 }}
          />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
        <AlertTriangle className="size-4 shrink-0 text-amber-400" />
        <p className="text-xs text-amber-100">3 alumnos en riesgo de baja esta semana</p>
      </div>

      <div className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
        <QrCode className="size-4 shrink-0 text-emerald-400" />
        <p className="text-xs text-emerald-100">Check-in por QR: 18 marcados hoy</p>
      </div>
    </div>
  );
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[120px]"
      />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-2 md:items-center md:py-32">
        <RevealOnScroll>
          <div className="flex flex-col gap-6">
            <span className="w-fit rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-brand-400">
              Software para gimnasios
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl md:text-6xl">
              Más que un sistema de gestión: un sistema que{" "}
              <span className="text-brand-400">retiene</span>
            </h1>
            <p className="max-w-lg text-lg text-white/70">
              Rutinas, asistencia y alertas de retención en un solo lugar.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href="/comenzar" />}
                className="h-12 bg-brand-500 px-6 text-base text-white hover:bg-brand-600"
              >
                Empezá gratis 7 días
                <ArrowRight />
              </Button>
            </div>
            <p className="text-xs text-white/50">Sin tarjeta de crédito</p>
          </div>
        </RevealOnScroll>

        <RevealOnScroll delayMs={150}>
          <HeroMock />
        </RevealOnScroll>
      </div>
    </section>
  );
}
