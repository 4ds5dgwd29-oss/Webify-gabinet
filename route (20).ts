import { cleanObjects } from "@/server/dal/privacy";
import { expireCommerce, reconcileSubscriptions } from "@/server/dal/commerce";
import { timingSafeEqual } from "node:crypto";
import { enqueueReminders, deliverOutbox } from "@/server/dal/reminders";
import { json, handleError } from "@/server/security/http";
export async function POST(request: Request) {
  const actual = request.headers.get("authorization") || "",
    expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (
    !process.env.CRON_SECRET ||
    Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
    !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  )
    return json({ error: "Brak uprawnień." }, 401);
  try {
    await reconcileSubscriptions();
    await expireCommerce();
    await cleanObjects();
    return json({
      reminders: await enqueueReminders(),
      delivery: await deliverOutbox(5),
    });
  } catch (e) {
    return handleError(e);
  }
}
