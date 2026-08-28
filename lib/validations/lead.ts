import { z } from "zod";

export const leadSchema = z.object({
  gym_name: z.string().trim().min(2, "Ingresá el nombre de tu gimnasio"),
  email: z.string().trim().min(1, "Ingresá tu email").email("Ingresá un email válido"),
  phone: z.string().trim().optional(),
});

export type LeadValues = z.infer<typeof leadSchema>;
