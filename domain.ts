import { z } from "zod";
export const optionalText = (max = 200) =>
  z.string().trim().max(max).optional().default("");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(""));
export const patientInput = z
  .object({
    firstName: z.string().trim().min(1).max(100),
    lastName: z.string().trim().min(1).max(100),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .or(z.literal(""))
      .optional()
      .default(""),
    phone: optionalText(30),
    birthDate: date.optional().default(""),
    emergencyName: optionalText(100),
    emergencyPhone: optionalText(30),
    consentData: z.boolean().default(false),
    consentContact: z.boolean().default(false),
    consentRecording: z.boolean().default(false),
    status: z.enum(["ACTIVE", "COMPLETED", "WAITLIST"]).default("ACTIVE"),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  })
  .strict();
export const appointmentInput = z
  .object({
    patientId: z.string().min(1),
    providerId: z.string().min(1),
    serviceId: z.string().optional(),
    localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    durationMinutes: z.number().int().min(10).max(480),
    type: z
      .enum(["CONSULTATION", "INDIVIDUAL", "COUPLE", "ONLINE"])
      .default("INDIVIDUAL"),
    onlineUrl: z
      .string()
      .url()
      .refine((v) => v.startsWith("https://"))
      .or(z.literal(""))
      .optional(),
    priceGrosze: z.number().int().min(0).max(10000000),
    repeatCount: z.number().int().min(1).max(52).default(1),
    repeatWeeks: z.number().int().min(1).max(12).default(1),
  })
  .strict();
export const hoursInput = z
  .object({
    providerId: z.string(),
    hours: z
      .array(
        z
          .object({
            weekday: z.number().int().min(1).max(7),
            startMinute: z.number().int().min(0).max(1439),
            endMinute: z.number().int().min(1).max(1440),
          })
          .refine((x) => x.startMinute < x.endMinute),
      )
      .max(28),
  })
  .strict();
export const serviceInput = z
  .object({
    name: z.string().trim().min(2).max(120),
    durationMinutes: z.number().int().min(10).max(480),
    priceGrosze: z.number().int().min(0).max(10000000),
    depositGrosze: z.number().int().min(0).max(10000000).default(0),
    active: z.boolean().default(true),
  })
  .strict()
  .refine((x) => x.depositGrosze <= x.priceGrosze);
export const roles = {
  OWNER: "Właściciel",
  STAFF: "Recepcja / asystent",
  SUPER_ADMIN: "Administrator platformy",
};
export const patientStatuses = {
  ACTIVE: "Aktywny",
  COMPLETED: "Zakończony",
  WAITLIST: "Lista oczekujących",
};
export const appointmentStatuses = {
  SCHEDULED: "Zaplanowana",
  COMPLETED: "Odbyta",
  CANCELLED: "Odwołana",
  NO_SHOW: "Nieobecność",
};
export const appointmentTypes = {
  CONSULTATION: "Konsultacja",
  INDIVIDUAL: "Terapia indywidualna",
  COUPLE: "Terapia par",
  ONLINE: "Wizyta online",
};
export function money(grosze: number) {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
  }).format(grosze / 100);
}
