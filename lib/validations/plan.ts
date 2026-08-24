import { z } from "zod";

export const planFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "Máximo 100 caracteres"),
  price: z
    .string()
    .trim()
    .refine((value) => {
      const parsed = Number(value);
      return !Number.isNaN(parsed) && parsed >= 0;
    }, "Tiene que ser un número mayor o igual a 0"),
  duration_days: z
    .string()
    .trim()
    .refine((value) => {
      const parsed = Number(value);
      return Number.isInteger(parsed) && parsed >= 1;
    }, "Tiene que ser un número entero de al menos 1 día"),
  active: z.boolean(),
});

export type PlanFormValues = z.infer<typeof planFormSchema>;

export const assignPlanSchema = z.object({
  plan_id: z.string().trim().min(1, "Elegí un plan"),
  start_date: z.string().trim().min(1, "Elegí una fecha de inicio"),
});

export type AssignPlanFormValues = z.infer<typeof assignPlanSchema>;
