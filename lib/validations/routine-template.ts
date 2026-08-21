import { z } from "zod";

const templateBaseFields = {
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres"),
  description: z.string().trim().max(500, "Máximo 500 caracteres").optional(),
};

export const templateDaySchema = z.object({
  name: z.string().trim().min(1, "Ponele un nombre a este día"),
});

export const templateSchema = z.object({
  ...templateBaseFields,
  days: z.array(templateDaySchema).min(1, "Agregá al menos un día").max(7, "Máximo 7 días"),
});

export type TemplateFormValues = z.infer<typeof templateSchema>;

export const templateUpdateSchema = z.object(templateBaseFields);

export type TemplateUpdateValues = z.infer<typeof templateUpdateSchema>;

export const templateDayNameSchema = z.object({
  name: z.string().trim().min(1, "Ponele un nombre a este día"),
});

export type TemplateDayNameValues = z.infer<typeof templateDayNameSchema>;

export const duplicateTemplateSchema = z.object({
  name: templateBaseFields.name,
});

export type DuplicateTemplateValues = z.infer<typeof duplicateTemplateSchema>;

export const assignTemplateSchema = z.object({
  templateId: z.string().trim().min(1),
  memberIds: z.array(z.string().trim().min(1)).min(1, "Elegí al menos un alumno"),
});

export type AssignTemplateValues = z.infer<typeof assignTemplateSchema>;

export const assignTemplateFormSchema = z.object({
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
});

export type AssignTemplateFormValues = z.infer<typeof assignTemplateFormSchema>;
