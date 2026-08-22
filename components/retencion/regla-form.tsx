"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  frequencyItems,
  retentionRuleSchema,
  type RetentionRuleFormValues,
} from "@/lib/validations/retention-rule";
import { formatFrequency, frequencyOptionToDbValue } from "@/lib/retention";
import { FREQUENCY_OPTIONS } from "@/types/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ReglaFormProps = {
  defaultValues: RetentionRuleFormValues;
  activeFieldLabel: string;
  errorTitle: string;
  submitLabel: string;
  submitLoadingLabel: string;
  onSubmit: (values: RetentionRuleFormValues) => Promise<{ error?: string } | void>;
};

export function ReglaForm({
  defaultValues,
  activeFieldLabel,
  errorTitle,
  submitLabel,
  submitLoadingLabel,
  onSubmit,
}: ReglaFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<RetentionRuleFormValues>({
    resolver: zodResolver(retentionRuleSchema),
    defaultValues,
  });

  const diasValue = useWatch({ control: form.control, name: "days_without_attendance" });
  const frecuenciaValue = useWatch({ control: form.control, name: "applies_to_frequency" });
  const diasPreview = Number(diasValue);
  const mostrarPreview = Number.isInteger(diasPreview) && diasPreview > 0;

  async function handleSubmit(values: RetentionRuleFormValues) {
    setLoading(true);
    const result = await onSubmit(values);

    if (result?.error) {
      toast.error(errorTitle, { description: result.error });
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Alerta estándar" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="days_without_attendance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Días sin asistencia</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={90} placeholder="10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="applies_to_frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aplicar a</FormLabel>
              <Select items={frequencyItems} value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <FormLabel className="!mb-0">{activeFieldLabel}</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </div>
            </FormItem>
          )}
        />
        {mostrarPreview && (
          <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
            Vista previa: Esta regla va a alertarte cuando alumnos{" "}
            <span className="font-medium text-foreground">
              {formatFrequency(frequencyOptionToDbValue(frecuenciaValue))}
            </span>{" "}
            no vengan hace <span className="font-medium text-foreground">{diasPreview}</span>{" "}
            días.
          </div>
        )}
        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <Button type="submit" disabled={loading}>
            {loading ? submitLoadingLabel : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
