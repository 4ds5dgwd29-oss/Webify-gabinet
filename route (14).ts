import { currentContext } from "@/server/auth/context";
import { downloadDocument } from "@/server/dal/documents";
import { handleError } from "@/server/security/http";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { session } = await currentContext();
    const { id } = await params;
    const file = await downloadDocument(session.id, id);
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
