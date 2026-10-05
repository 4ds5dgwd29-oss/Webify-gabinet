import { requestReset, resetPassword } from "@/server/dal/accounts";
import { rateLimit, requestIdentity } from "@/server/auth/rate-limit";
import { json, handleError, readMutation } from "@/server/security/http";
import { z } from "zod";
export async function POST(r: Request) {
  try {
    await rateLimit(
      "password-reset",
      requestIdentity(Object.fromEntries(r.headers)),
      8,
    );
    const d = z
      .object({
        action: z.enum(["request", "reset"]),
        email: z.string().optional(),
        token: z.string().optional(),
        password: z.string().optional(),
      })
      .strict()
      .parse(await readMutation(r));
    return json(
      d.action === "request"
        ? await requestReset(d.email)
        : await resetPassword({ token: d.token, password: d.password }),
    );
  } catch (e) {
    return handleError(e);
  }
}
