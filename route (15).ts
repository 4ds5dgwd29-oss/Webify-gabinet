import { currentContext } from "@/server/auth/context";
import { uploadDocument } from "@/server/dal/documents";
import { readMutation, json, handleError } from "@/server/security/http";
export async function POST(request: Request) {
  try {
    const input = await readMutation(request, 15 * 1024 * 1024);
    const { session } = await currentContext();
    return json(await uploadDocument(session.id, input));
  } catch (e) {
    return handleError(e);
  }
}
