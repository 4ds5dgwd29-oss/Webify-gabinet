import { currentContext } from "@/server/auth/context";
import { adminData, adminAction, supportView } from "@/server/dal/admin";
import { json, handleError, readMutation } from "@/server/security/http";
import { z } from "zod";
export async function GET(r: Request) {
  try {
    const { session } = await currentContext();
    const support = new URL(r.url).searchParams.get("support");
    return json(
      support
        ? await supportView(session.id, support)
        : await adminData(session.id),
    );
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(r: Request) {
  try {
    const d = z
      .object({ action: z.string(), data: z.unknown() })
      .strict()
      .parse(await readMutation(r));
    const { session } = await currentContext();
    return json(await adminAction(session.id, d.action, d.data));
  } catch (e) {
    return handleError(e);
  }
}
