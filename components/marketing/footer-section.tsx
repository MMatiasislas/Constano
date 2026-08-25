import { MessageCircle } from "lucide-react";

import { whatsappHref } from "@/lib/members";
import { WHATSAPP_PLACEHOLDER_NUMBER } from "@/lib/marketing";

// PLACEHOLDER: mismo número de lib/marketing.ts — reemplazar antes de
// producción por el WhatsApp real de contacto.
const CONTACT_MESSAGE = "Hola! Tengo una consulta sobre Constano.";

export function FooterSection() {
  return (
    <footer className="bg-neutral-950 px-4 py-10 text-white/60 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <span className="text-sm font-semibold tracking-tight text-white">Constano</span>
        <p className="text-xs">© 2026 Constano. Todos los derechos reservados.</p>
        <a
          href={whatsappHref(WHATSAPP_PLACEHOLDER_NUMBER, CONTACT_MESSAGE)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium text-white/80 transition-colors hover:text-white"
        >
          <MessageCircle className="size-3.5" />
          Contacto por WhatsApp
        </a>
      </div>
    </footer>
  );
}
