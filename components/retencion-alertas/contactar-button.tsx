"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PhoneCallIcon } from "lucide-react";

import { markAlertContacted } from "@/app/(dashboard)/dashboard/retencion/actions";
import { Button } from "@/components/ui/button";

export function ContactarButton({ alertId }: { alertId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await markAlertContacted(alertId);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos actualizar la alerta", { description: result.error });
      return;
    }

    toast.success("Marcada como contactada");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" disabled={loading} onClick={handleClick}>
      <PhoneCallIcon />
      {loading ? "Guardando..." : "Marcar contactada"}
    </Button>
  );
}
