import { currentContext } from "@/server/auth/context";
import { exportPatient } from "@/server/dal/privacy";
import { handleError } from "@/server/security/http";
export async function GET(r: Request) {
  try {
    const { session } = await currentContext();
    const data = await exportPatient(
      session.id,
      new URL(r.url).searchParams.get("id") || "",
    );
    return new Response(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": "attachment; filename=eksport-pacjenta.json",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
