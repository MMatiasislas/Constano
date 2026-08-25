import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RevealOnScroll } from "./reveal-on-scroll";

export function FinalCtaSection() {
  return (
    <section className="bg-orange-500 px-4 py-20 text-center sm:px-6 sm:py-24">
      <RevealOnScroll className="mx-auto flex max-w-2xl flex-col items-center gap-6">
        <h2 className="text-3xl font-bold tracking-tight text-white text-balance sm:text-4xl">
          Empezá a retener alumnos hoy
        </h2>
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href="/signup" />}
          className="h-12 bg-neutral-950 px-6 text-base text-white hover:bg-neutral-800"
        >
          Probar gratis 7 días
          <ArrowRight />
        </Button>
      </RevealOnScroll>
    </section>
  );
}
