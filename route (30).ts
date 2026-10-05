import { p24Notification } from "@/server/dal/commerce";
import { json, handleError, readRawBody } from "@/server/security/http";
export async function POST(request: Request) {
  try {
    const text = (await readRawBody(request, 16384)).toString("utf8");
    if (text.length > 16384) return json({ error: "Zbyt duże żądanie." }, 413);
    await p24Notification(JSON.parse(text));
    return json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
