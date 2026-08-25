import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { LandingHeader } from "@/components/marketing/landing-header";
import { HeroSection } from "@/components/marketing/hero-section";
import { ProblemSection } from "@/components/marketing/problem-section";
import { FeaturesSection } from "@/components/marketing/features-section";
import { HowItWorksSection } from "@/components/marketing/how-it-works-section";
import { PricingSection } from "@/components/marketing/pricing-section";
import { FinalCtaSection } from "@/components/marketing/final-cta-section";
import { FooterSection } from "@/components/marketing/footer-section";

export const metadata: Metadata = {
  title: "Constano — Software de gestión y retención para gimnasios",
  description:
    "Rutinas, asistencia y alertas de retención en un solo lugar. El sistema que detecta alumnos en riesgo de baja antes que vos. Empezá gratis 7 días, sin tarjeta de crédito.",
};

// Home pública: siempre muestra la landing, esté logueado o no el visitante
// (mismo criterio que cualquier SaaS — antes esto redirigía directo a
// /dashboard o /login). El login solo se usa para decidir el label/link del
// header ("Ir al dashboard" vs "Iniciar sesión"); el acceso real al panel
// sigue siendo vía /login → /dashboard.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-col">
      <LandingHeader isLoggedIn={!!user} />
      <main className="flex-1">
        <HeroSection />
        <ProblemSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <FinalCtaSection />
      </main>
      <FooterSection />
    </div>
  );
}
