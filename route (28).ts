import { registerOrder } from "@/server/dal/commerce";
import { z } from "zod";
import { publicSlots, book } from "@/server/dal/booking";
import { json, handleError, readMutation } from "@/server/security/http";
import { rateLimit, requestIdentity } from "@/server/auth/rate-limit";
export async function GET(r: Request) {
  try {
    await rateLimit(
      "slots",
      requestIdentity(Object.fromEntries(r.headers)),
      200,
    );
    const q = new URL(r.url).searchParams;
    return json(
      await publicSlots(
        q.get("slug") || "",
        q.get("service") || undefined,
        q.get("day") || undefined,
      ),
    );
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(r: Request) {
  try {
    await rateLimit(
      "booking",
      requestIdentity(Object.fromEntries(r.headers)),
      10,
    );
    const body = await readMutation(r);
    if (body.action === "retry") {
      const d = z
        .object({ action: z.literal("retry"), id: z.string().uuid() })
        .strict()
        .parse(body);
      return json(await registerOrder(d.id));
    }
    return json(await book(body));
  } catch (e) {
    return handleError(e);
  }
}
