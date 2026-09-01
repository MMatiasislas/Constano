import type { MetadataRoute } from "next";

// Mismo criterio que app/robots.ts: dominio hardcodeado a propósito, no
// `getSiteUrl()` (esa es para links funcionales que también deben andar en
// preview/local). Solo se lista la home pública — no hay otras páginas de
// contenido indexables todavía (login/signup/comenzar son flujos de alta,
// no contenido de marketing, y el resto de la app es privado).
const SITE_URL = "https://www.constano.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
