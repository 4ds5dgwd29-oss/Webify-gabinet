import { currentContext } from "@/server/auth/context";
import { calendarFeed } from "@/server/dal/calendar";
import { handleError } from "@/server/security/http";
export async function GET() {
  try {
    const { session } = await currentContext();
    return new Response(await calendarFeed(session.id), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": "attachment; filename=webify.ics",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
