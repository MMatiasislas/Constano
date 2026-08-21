import { z } from "zod";

import { MESES } from "@/types/db";

export const monthOptions = [
  { value: "ninguno", label: "Sin mes" },
  ...MESES.map((mes, index) => ({ value: String(index + 1), label: mes })),
] as const;

export const monthItems = Object.fromEntries(
  monthOptions.map((option) => [option.value, option.label])
);

export const dayCountOptions = ["1", "2", "3", "4", "5", "6", "7"] as const;

export const dayCountItems = Object.fromEntries(
  dayCountOptions.map((value) => [value, `${value} ${value === "1" ? "día" : "días"}`])
);

const routineBaseFields = {
  title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres"),
  month_number: z.enum([
    "ninguno",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
  ]),
  notes: z.string().trim().optional(),
};

export const routineDaySchema = z.object({
  name: z.string().trim().min(1, "Ponele un nombre a este día"),
});

export const routineFormSchema = z.object({
  ...routineBaseFields,
  days: z.array(routineDaySchema).min(1, "Agregá al menos un día").max(7, "Máximo 7 días"),
});

export type RoutineFormValues = z.infer<typeof routineFormSchema>;

export const routineInfoFormSchema = z.object(routineBaseFields);

export type RoutineInfoFormValues = z.infer<typeof routineInfoFormSchema>;

export const routineDayNameSchema = z.object({
  name: z.string().trim().min(1, "Ponele un nombre a este día"),
});

export type RoutineDayNameValues = z.infer<typeof routineDayNameSchema>;

function numericStringField(opts: {
  int?: boolean;
  min?: number;
  max?: number;
  message: string;
}) {
  return z
    .string()
    .trim()
    .optional()
    .refine(
      (value) => {
        if (!value) return true;
        const parsed = Number(value);
        if (Number.isNaN(parsed)) return false;
        if (opts.int && !Number.isInteger(parsed)) return false;
        if (opts.min !== undefined && parsed < opts.min) return false;
        if (opts.max !== undefined && parsed > opts.max) return false;
        return true;
      },
      { message: opts.message }
    );
}

const routineExerciseDetailsFields = {
  sets: numericStringField({ int: true, min: 1, max: 20, message: "Entre 1 y 20 series" }),
  reps: z.string().trim().max(50, "Máximo 50 caracteres").optional(),
  weight: numericStringField({ min: 0, message: "Tiene que ser 0 o mayor" }),
  rest_seconds: numericStringField({
    int: true,
    min: 0,
    max: 600,
    message: "Entre 0 y 600 segundos",
  }),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
};

export const routineExerciseDetailsSchema = z.object(routineExerciseDetailsFields);

export type RoutineExerciseDetailsValues = z.infer<typeof routineExerciseDetailsSchema>;

export const routineExerciseSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  muscle_group: z.string().trim().optional(),
  ...routineExerciseDetailsFields,
});

export type RoutineExerciseValues = z.infer<typeof routineExerciseSchema>;
