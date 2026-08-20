import { z } from "zod";

export const weeklyFrequencyOptions = [
  { value: "libre", label: "Libre" },
  { value: "1", label: "1x por semana" },
  { value: "2", label: "2x por semana" },
  { value: "3", label: "3x por semana" },
  { value: "4", label: "4x por semana" },
  { value: "5", label: "5x por semana" },
  { value: "6", label: "6x por semana" },
] as const;

// Base UI's <Select.Value> necesita este mapa value -> label para mostrar
// el texto elegido; sin "items" muestra el value crudo (ver CLAUDE.md).
export const weeklyFrequencyItems = Object.fromEntries(
  weeklyFrequencyOptions.map((option) => [option.value, option.label])
);

export const memberFormSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres"),
  last_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z
    .union([z.literal(""), z.string().trim().email("Ingresá un email válido")])
    .optional(),
  birth_date: z.string().optional(),
  joined_at: z.string().min(1, "Ingresá la fecha de alta"),
  weekly_frequency: z.enum(["libre", "1", "2", "3", "4", "5", "6"]),
  notes: z.string().trim().optional(),
});

export type MemberFormValues = z.infer<typeof memberFormSchema>;
