import { z } from "zod";
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Podaj poprawny adres e-mail.")
  .max(254);
export const passwordSchema = z
  .string()
  .min(12, "Hasło musi mieć co najmniej 12 znaków.")
  .max(128, "Hasło może mieć najwyżej 128 znaków.");
export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
    otp: z
      .string()
      .regex(/^\d{6}$/)
      .or(z.literal(""))
      .optional(),
  })
  .strict();
export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    practiceName: z.string().trim().min(2).max(120),
    email: emailSchema,
    password: passwordSchema,
  })
  .strict();
export const patientSchema = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: emailSchema.optional(),
    phone: z.string().trim().max(30).optional(),
  })
  .strict();
export const securitySchema = z
  .object({
    action: z.enum(["setup", "enable", "disable"]),
    password: z.string().min(1).max(128),
    otp: z
      .string()
      .regex(/^\d{6}$/)
      .optional(),
  })
  .strict();
