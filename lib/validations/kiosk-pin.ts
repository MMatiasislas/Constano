import { z } from "zod";

export const kioskPinSchema = z.object({
  pin: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "El PIN tiene que ser de 4 números"),
});

export type KioskPinFormValues = z.infer<typeof kioskPinSchema>;
