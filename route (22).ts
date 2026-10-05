import { currentContext } from "@/server/auth/context";
import { changeTotp } from "@/server/dal/account";
import { readMutation, json, handleError } from "@/server/security/http";
export async function POST(request: Request) {
  try {
    const input = await readMutation(request);
    const { session } = await currentContext();
    return json(await changeTotp(session.id, input));
  } catch (error) {
    return handleError(error);
  }
}
