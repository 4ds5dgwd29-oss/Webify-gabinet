import { readMutation, json, handleError } from "@/server/security/http";
import { useAppointmentToken } from "@/server/dal/reminders";
import { z } from "zod";
import { rateLimit, requestIdentity } from "@/server/auth/rate-limit";
export async function POST(request: Request) {
  try {
    const data = z
      .object({
        token: z.string().min(40).max(100),
        action: z.enum(["confirm", "cancel"]),
      })
      .strict()
      .parse(await readMutation(request));
    await rateLimit(
      "visit-link",
      requestIdentity(Object.fromEntries(request.headers)),
      50,
    );
    return json(await useAppointmentToken(data.token, data.action));
  } catch (e) {
    return handleError(e);
  }
}
