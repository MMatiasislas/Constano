"use client";

import type { Control } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { RoutineExerciseDetailsValues } from "@/lib/validations/routine";

export function EjercicioDetallesFields({
  control,
}: {
  control: Control<RoutineExerciseDetailsValues>;
}) {
  return (
    <>
      <FormField
        control={control}
        name="sets"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Series</FormLabel>
            <FormControl>
              <Input type="number" min={1} max={20} placeholder="4" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="reps"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Repeticiones</FormLabel>
            <FormControl>
              <Input placeholder="Ej: 8-10, AMRAP, al fallo, 30 segundos" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="weight"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Peso (kg)</FormLabel>
            <FormControl>
              <Input type="number" min={0} step="0.5" placeholder="80" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="rest_seconds"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descanso (segundos)</FormLabel>
            <FormControl>
              <Input type="number" min={0} max={600} placeholder="90" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notas</FormLabel>
            <FormControl>
              <Textarea placeholder="Aclaraciones para este ejercicio" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
