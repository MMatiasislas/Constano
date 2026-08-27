"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

const MESSAGES: Record<string, { title: string; description?: string }> = {
  "sin-acceso": {
    title: "No tenés acceso a esta sección",
    description: "Esa parte del dashboard es solo para el dueño del gimnasio.",
  },
};

/**
 * Muestra un toast a partir de `?toast=<key>` en la URL y después limpia el
 * parámetro (para que no vuelva a aparecer si se recarga la página). Pensado
 * para redirects server-side que no pueden disparar un toast directamente
 * (ej. `requireOwner()` en lib/auth/require-owner.ts).
 */
function QueryToastInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const key = searchParams.get("toast");
    if (!key) return;

    const message = MESSAGES[key];
    if (message) {
      toast.error(message.title, { description: message.description });
    }

    const params = new URLSearchParams(searchParams);
    params.delete("toast");
    router.replace(params.size > 0 ? `${pathname}?${params}` : pathname, { scroll: false });
  }, [searchParams, pathname, router]);

  return null;
}

export function QueryToast() {
  return (
    <Suspense fallback={null}>
      <QueryToastInner />
    </Suspense>
  );
}
