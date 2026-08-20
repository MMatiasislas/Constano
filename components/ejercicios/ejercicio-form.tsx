"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  exerciseFormSchema,
  muscleGroupItems,
  muscleGroupOptions,
  type ExerciseFormValues,
} from "@/lib/validations/exercise";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

type ExerciseFormProps = {
  defaultValues: ExerciseFormValues;
  errorTitle: string;
  submitLabel: string;
  submitLoadingLabel: string;
  onSubmit: (values: ExerciseFormValues) => Promise<{ error?: string } | void>;
};

export function ExerciseForm({
  defaultValues,
  errorTitle,
  submitLabel,
  submitLoadingLabel,
  onSubmit,
}: ExerciseFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues,
  });

  async function handleSubmit(values: ExerciseFormValues) {
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
                <Input placeholder="Press banca" autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="muscle_group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Grupo muscular</FormLabel>
              <Select
                items={muscleGroupItems}
                value={field.value}
                onValueChange={field.onChange}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {muscleGroupOptions.map((option) => (
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
