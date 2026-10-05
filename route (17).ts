import { currentContext } from "@/server/auth/context";
import { practiceRepository } from "@/server/dal/practice";
import { json, handleError } from "@/server/security/http";
export async function GET() {
  try {
    const { session } = await currentContext();
    return json(await practiceRepository(session.id).summary());
  } catch (error) {
    return handleError(error);
  }
}
