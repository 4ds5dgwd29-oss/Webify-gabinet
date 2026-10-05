import { registerPractice } from "@/server/auth/register";
import { rateLimit, requestIdentity } from "@/server/auth/rate-limit";
import { readMutation, json, handleError } from "@/server/security/http";
export async function POST(request: Request) {
  try {
    const input = await readMutation(request);
    await rateLimit(
      "register-ip",
      requestIdentity(Object.fromEntries(request.headers)),
      5,
    );
    await registerPractice(input);
    return json(
      {
        message:
          "Jeśli adres nie był wcześniej używany, konto jest gotowe. Możesz się zalogować.",
      },
      201,
    );
  } catch (error) {
    return handleError(error);
  }
}
