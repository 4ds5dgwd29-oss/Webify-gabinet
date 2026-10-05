import { currentContext } from "@/server/auth/context";
import { readMutation, json, handleError } from "@/server/security/http";
export async function POST(request: Request) {
  try {
    await readMutation(request);
    await currentContext(true);
    return json({ active: true });
  } catch (error) {
    return handleError(error);
  }
}
