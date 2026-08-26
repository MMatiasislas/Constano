"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";

import { markOnboardingSeen } from "@/app/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STEPS = [
  {
    number: 1,
    title: "CARGÁ TUS ALUMNOS",
    text: "Importalos desde Excel o cargalos uno por uno. Es la base de todo lo demás.",
    href: "/dashboard/alumnos",
    cta: "Ir a Alumnos",
  },
  {
    number: 2,
    title: "ARMÁ SUS RUTINAS",
    text: "Usá la biblioteca de ejercicios o creá plantillas reutilizables para ahorrar tiempo.",
    href: "/dashboard/ejercicios",
    cta: "Ir a Ejercicios",
  },
  {
    number: 3,
    title: "CONFIGURÁ LA RETENCIÓN",
    text: "Definí cuándo querés que te avisemos si un alumno deja de venir.",
    href: "/dashboard/configuracion/retencion",
    cta: "Ir a Retención",
  },
];

export function OnboardingDialog({
  defaultOpen = false,
  markAsSeen = true,
}: {
  defaultOpen?: boolean;
  markAsSeen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const router = useRouter();
  const [, startTransition] = useTransition();

  function close() {
    setOpen(false);
    if (markAsSeen) {
      startTransition(() => {
        markOnboardingSeen();
      });
    }
  }

  function handleStepClick(href: string) {
    close();
    router.push(href);
  }

  return (
    <Dialog
      open={open}
      // Controlado a propósito: nunca actualizamos el estado desde acá, así
      // que un click afuera o Escape no lo cierran — solo `close()` (botón
      // principal o los links de cada paso) puede cerrarlo.
      onOpenChange={() => {}}
      disablePointerDismissal
    >
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <DialogHeader className="items-center text-center">
          <span className="text-4xl" aria-hidden>
            🚀
          </span>
          <DialogTitle className="text-xl">¡Bienvenido a Constano!</DialogTitle>
          <DialogDescription>Seguí este orden para arrancar con el pie derecho:</DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {STEPS.map((step) => (
            <Card key={step.number} size="sm">
              <CardContent className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.number}
                </span>
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-bold tracking-tight">
                    {step.number}. {step.title}
                  </p>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                  <button
                    type="button"
                    onClick={() => handleStepClick(step.href)}
                    className="mt-1 inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    {step.cta} <ArrowRightIcon className="size-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={close}>
          Entendido, empezar
        </Button>

        {/* TODO: linkear a la guía completa paso a paso cuando exista */}
        <button
          type="button"
          onClick={close}
          className="-mt-2 text-center text-xs text-muted-foreground hover:underline"
        >
          Ver guía completa paso a paso
        </button>
      </DialogContent>
    </Dialog>
  );
}
