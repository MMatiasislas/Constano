import { z } from "zod";

import { PAYMENT_METHODS, type PaymentMethod } from "@/types/db";

export const methodItems = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.value, method.label])
);

const methodValues = PAYMENT_METHODS.map((method) => method.value) as [
  PaymentMethod,
  ...PaymentMethod[],
];

export const paymentSchema = z.object({
  amount: z
    .string()
    .trim()
    .refine((value) => {
      const parsed = Number(value);
      return !Number.isNaN(parsed) && parsed > 0;
    }, "Tiene que ser un número mayor a 0"),
  method: z.enum(methodValues),
  paid_at: z.string().trim().min(1, "Elegí una fecha"),
  notes: z.string().trim().max(300, "Máximo 300 caracteres").optional(),
});

export type PaymentFormValues = z.infer<typeof paymentSchema>;
