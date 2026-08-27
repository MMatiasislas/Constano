import { z } from "zod";

export const inviteTeamMemberSchema = z.object({
  email: z.string().min(1, "Ingresá un email").email("Ingresá un email válido"),
});

export type InviteTeamMemberValues = z.infer<typeof inviteTeamMemberSchema>;

export const acceptInvitationSchema = z
  .object({
    full_name: z.string().min(2, "Ingresá tu nombre completo"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirm_password: z.string().min(1, "Confirmá tu contraseña"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Las contraseñas no coinciden",
    path: ["confirm_password"],
  });

export type AcceptInvitationValues = z.infer<typeof acceptInvitationSchema>;
