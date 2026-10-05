import { stripe } from "@/server/stripe";
import { stripeEvent } from "@/server/dal/commerce";
import { json, handleError, readRawBody } from "@/server/security/http";
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET)
      return json({ error: "Brak konfiguracji." }, 503);
    const body = (await readRawBody(request, 1048576)).toString("utf8");
    if (body.length > 1048576)
      return json({ error: "Zbyt duże żądanie." }, 413);
    let event;
    try {
      event = stripe().webhooks.constructEvent(
        body,
        request.headers.get("stripe-signature") || "",
        process.env.STRIPE_WEBHOOK_SECRET,
      );
    } catch {
      return json({ error: "Niepoprawny podpis." }, 400);
    }
    await stripeEvent(event);
    return json({ received: true });
  } catch (e) {
    return handleError(e);
  }
}
