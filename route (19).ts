import { databaseReady } from "@/server/dal/health";
export async function GET() {
  try {
    await databaseReady();
    return Response.json(
      { status: "ok", version: "1.0.0" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
