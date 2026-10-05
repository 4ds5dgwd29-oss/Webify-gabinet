import { calendarFeed } from "@/server/dal/calendar";
import { handleError } from "@/server/security/http";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    return new Response(await calendarFeed(undefined, token), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
