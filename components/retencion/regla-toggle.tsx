"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { toggleRetentionRule } from "@/app/(dashboard)/dashboard/configuracion/retencion/actions";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { RetentionRule } from "@/types/db";

export function ReglaToggle({ rule }: { rule: RetentionRule }) {
  const router = useRouter();
  const [prevRule, setPrevRule] = useState(rule);
  const [active, setActive] = useState(rule.active);
  const [loading, setLoading] = useState(false);

  if (rule !== prevRule) {
    setPrevRule(rule);
    setActive(rule.active);
  }

  async function handleChange(checked: boolean) {
    setLoading(true);
    setActive(checked);

    const result = await toggleRetentionRule(rule.id, checked);
    setLoading(false);

    if (result?.error) {
      setActive(!checked);
      toast.error("No pudimos actualizar la regla", { description: result.error });
      return;
    }

    toast.success(checked ? "Regla activada" : "Regla desactivada");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      {!active && (
        <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">
          Inactiva
        </Badge>
      )}
      <Switch checked={active} disabled={loading} onCheckedChange={handleChange} />
    </div>
  );
}
