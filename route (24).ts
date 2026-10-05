import { currentContext } from "@/server/auth/context";
import { listPractices } from "@/server/dal/platform";
import { json, handleError } from "@/server/security/http";
export async function GET() {
  try {
    const { session } = await currentContext();
    return json(await listPractices(session.id));
  } catch (error) {
    return handleError(error);
  }
}
