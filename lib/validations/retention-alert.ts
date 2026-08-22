import { z } from "zod";

import { RESOLUTION_REASON_OPTIONS, type ResolutionReasonValue } from "@/types/db";

export const resolutionReasonItems = Object.fromEntries(
  RESOLUTION_REASON_OPTIONS.map((option) => [option.value, option.label])
);

const resolutionReasonValues = RESOLUTION_REASON_OPTIONS.map((option) => option.value) as [
  ResolutionReasonValue,
  ...ResolutionReasonValue[],
];

export const resolveAlertSchema = z.object({
  resolution_reason: z.enum(resolutionReasonValues, {
    error: "Elegí un motivo",
  }),
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export type ResolveAlertFormValues = z.infer<typeof resolveAlertSchema>;

export const dismissAlertSchema = z.object({
  notes: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
});

export type DismissAlertFormValues = z.infer<typeof dismissAlertSchema>;
