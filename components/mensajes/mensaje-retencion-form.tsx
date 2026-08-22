"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MessageCircleIcon, RotateCcwIcon } from "lucide-react";

import { updateRetentionMessage } from "@/app/(dashboard)/dashboard/configuracion/mensajes/actions";
import { DEFAULT_WHATSAPP_TEMPLATE, renderWhatsAppMessage } from "@/lib/retention";
import {
  RETENTION_MESSAGE_MAX_LENGTH,
  retentionMessageSchema,
  type RetentionMessageFormValues,
} from "@/lib/validations/retention-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

const VARIABLES = ["{nombre}", "{dias}", "{gym}"];

const PREVIEW_NOMBRE = "Juan Pérez";
const PREVIEW_DIAS = 10;

export function MensajeRetencionForm({
  initialMessage,
  gymName,
}: {
  initialMessage: string;
  gymName: string;
}) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RetentionMessageFormValues>({
    resolver: zodResolver(retentionMessageSchema),
    defaultValues: { message: initialMessage },
  });

  const mensajeActual = useWatch({ control: form.control, name: "message" }) ?? "";
  const preview = renderWhatsAppMessage(mensajeActual, PREVIEW_NOMBRE, PREVIEW_DIAS, gymName);

  async function handleSubmit(values: RetentionMessageFormValues) {
    setLoading(true);
    const result = await updateRetentionMessage(values.message);
    setLoading(false);

    if (result?.error) {
      toast.error("No pudimos guardar el mensaje", { description: result.error });
      return;
    }

    toast.success("Mensaje guardado");
  }

  function handleRestaurar() {
    form.setValue("message", DEFAULT_WHATSAPP_TEMPLATE, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea rows={5} placeholder={DEFAULT_WHATSAPP_TEMPLATE} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center gap-1.5">
              <span>Variables:</span>
              {VARIABLES.map((variable) => (
                <code
                  key={variable}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                >
                  {variable}
                </code>
              ))}
            </div>
            <span
              className={
                mensajeActual.length > RETENTION_MESSAGE_MAX_LENGTH ? "text-destructive" : ""
              }
            >
              {mensajeActual.length}/{RETENTION_MESSAGE_MAX_LENGTH}
            </span>
          </div>
        </div>

        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MessageCircleIcon className="size-4" />
              Así se ve con datos de ejemplo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm">
              {preview || "Escribí un mensaje para ver la vista previa."}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" onClick={handleRestaurar}>
            <RotateCcwIcon />
            Restaurar mensaje por defecto
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
