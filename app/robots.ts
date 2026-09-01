import type { MetadataRoute } from "next";

// Dominio hardcodeado a propósito (no `getSiteUrl()`): esa función cae a
// `NEXT_PUBLIC_SITE_URL`/`VERCEL_URL`, pensadas para links funcionales
// (checkout de MP, QR de check-in) que tienen que andar también en preview
// deploys o local — acá, en cambio, necesitamos siempre el dominio canónico
// real para que buscadores no indexen bajo un dominio de preview o
// localhost por error.
const SITE_URL = "https://www.constano.com";

// Convención nativa de Next.js (App Router) — genera /robots.txt en build
// time, no hace falta un archivo estático en public/. Permite indexar la
// landing pública y el flujo de alta (/comenzar, /signup, /login), pero
// bloquea todo lo que es panel privado o específico de un gym (nunca debería
// aparecer en un buscador): el dashboard entero, el kiosco de check-in de
// cada gimnasio (URLs con el slug del gym) y las invitaciones de equipo
// (tokens, no contenido para indexar).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/checkin", "/invitacion"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
