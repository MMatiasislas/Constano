import { z } from "zod";

export const RETENTION_MESSAGE_MAX_LENGTH = 500;

export const retentionMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío")
    .max(RETENTION_MESSAGE_MAX_LENGTH, `Máximo ${RETENTION_MESSAGE_MAX_LENGTH} caracteres`),
});

export type RetentionMessageFormValues = z.infer<typeof retentionMessageSchema>;
