import { legalPdf } from "@/server/dal/privacy";
import { receiptPdf, revenuePdf } from "@/server/dal/billing";
import { currentContext } from "@/server/auth/context";
import { patientPdf } from "@/server/dal/documents";
import { handleError } from "@/server/security/http";
export async function GET(request: Request) {
  try {
    const { session } = await currentContext();
    const q = new URL(request.url).searchParams;
    const bytes =
      q.get("kind") === "legal"
        ? await legalPdf(session.id, q.get("template") || "")
        : q.get("kind") === "receipt"
          ? await receiptPdf(session.id, q.get("id") || "")
          : q.get("kind") === "revenue"
            ? await revenuePdf(session.id, q.get("month") || "")
            : await patientPdf(
                session.id,
                q.get("patientId") || "",
                q.get("kind") || "",
                q.get("appointmentId") || undefined,
              );
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=dokument.pdf",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
