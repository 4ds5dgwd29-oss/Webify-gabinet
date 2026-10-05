import { privacyData, setRetention, erasePatient } from "@/server/dal/privacy";
import { team, invite, setMember } from "@/server/dal/accounts";
import { feedback } from "@/server/dal/admin";
import {
  commerceSettings,
  checkout,
  portal,
  invoices,
  paymentLink,
  onlineOrders,
  resolveOnlineOrder,
} from "@/server/dal/commerce";
import {
  services,
  saveService,
  addPayment,
  voidPayment,
  billingData,
  dashboard,
} from "@/server/dal/billing";
import { reminderSettings } from "@/server/dal/reminders";
import {
  patientHistory,
  readNote,
  saveNote,
  saveGoal,
  savePlan,
  templates,
  saveTemplate,
} from "@/server/dal/clinical";
import { currentContext } from "@/server/auth/context";
import { json, handleError, readMutation } from "@/server/security/http";
import { z } from "zod";
import {
  patients,
  savePatient,
  restorePatient,
  importPatients,
} from "@/server/dal/patients";
import { practiceRepository } from "@/server/dal/practice";
import {
  calendarData,
  calendarOptions,
  saveAppointment,
  setAppointmentStatus,
  saveHours,
  saveLeave,
  removeLeave,
  savePracticeSettings,
  rotateFeed,
} from "@/server/dal/calendar";
export async function GET(request: Request) {
  try {
    const { session } = await currentContext();
    const q = new URL(request.url).searchParams;
    switch (q.get("resource")) {
      case "commerce":
        return json(await commerceSettings(session.id));
      case "invoices":
        return json(await invoices(session.id));
      case "team":
        return json(await team(session.id));
      case "feedback":
        return json(await feedback(session.id));
      case "privacy":
        return json(await privacyData(session.id));
      case "onlineOrders":
        return json(await onlineOrders(session.id));
      case "history":
        return json(await patientHistory(session.id, q.get("id") || ""));
      case "note":
        return json(
          await readNote(
            session.id,
            q.get("id") || "",
            q.get("version") ? Number(q.get("version")) : undefined,
          ),
        );
      case "templates":
        return json(await templates(session.id));
      case "services":
        return json(await services(session.id));
      case "billing":
        return json(await billingData(session.id, q.get("month") || ""));
      case "dashboard":
        return json(await dashboard(session.id));
      case "reminders":
        return json(await reminderSettings(session.id));
      case "patients":
        return json(
          await patients(session.id, {
            search: q.get("search") || "",
            status: q.get("status") || "",
            tag: q.get("tag") || "",
            archived: q.get("archived") === "true",
            page: Number(q.get("page") || 1),
          }),
        );
      case "patient":
        return json(
          await practiceRepository(session.id).getPatient(q.get("id") || ""),
        );
      case "calendar":
        return json(
          await calendarData(
            session.id,
            q.get("from") || "",
            q.get("to") || "",
          ),
        );
      case "options":
        return json(await calendarOptions(session.id));
      default:
        return json({ error: "Nieznany zasób." }, 404);
    }
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(request: Request) {
  try {
    const body = z
      .object({
        action: z.string(),
        data: z.unknown().optional(),
        id: z.string().optional(),
        version: z.number().int().optional(),
      })
      .strict()
      .parse(await readMutation(request, 262144));
    const { session } = await currentContext();
    const sid = session.id;
    let result: unknown;
    switch (body.action) {
      case "commerce.save":
        result = await commerceSettings(sid, body.data);
        break;
      case "stripe.checkout":
        result = await checkout(sid, body.data);
        break;
      case "stripe.portal":
        result = await portal(sid);
        break;
      case "payment.link":
        result = await paymentLink(sid, z.string().parse(body.id));
        break;
      case "team.invite":
        result = await invite(sid, body.data);
        break;
      case "team.update":
        result = await setMember(sid, body.data);
        break;
      case "feedback.save":
        result = await feedback(sid, body.data);
        break;
      case "retention.save":
        result = await setRetention(sid, body.data);
        break;
      case "patient.erase":
        result = await erasePatient(sid, body.data);
        break;
      case "order.resolve":
        result = await resolveOnlineOrder(sid, body.data);
        break;
      case "note.save":
        result = await saveNote(sid, body.data);
        break;
      case "goal.save":
        result = await saveGoal(sid, body.data);
        break;
      case "plan.save":
        result = await savePlan(sid, body.data);
        break;
      case "template.save":
        result = await saveTemplate(sid, body.data);
        break;
      case "service.save":
        result = await saveService(sid, body.data, body.id);
        break;
      case "payment.add":
        result = await addPayment(sid, body.data);
        break;
      case "payment.void":
        result = await voidPayment(sid, z.string().parse(body.id));
        break;
      case "reminders.save":
        result = await reminderSettings(sid, body.data);
        break;
      case "patient.save":
        result = await savePatient(sid, body.data, body.id, body.version);
        break;
      case "patient.archive":
        result = await practiceRepository(sid).archivePatient(
          z.string().parse(body.id),
        );
        break;
      case "patient.restore":
        result = await restorePatient(sid, z.string().parse(body.id));
        break;
      case "patient.import":
        result = await importPatients(
          sid,
          z.string().max(200000).parse(body.data),
        );
        break;
      case "appointment.save":
        result = await saveAppointment(sid, body.data, body.id, body.version);
        break;
      case "appointment.status":
        result = await setAppointmentStatus(
          sid,
          z.string().parse(body.id),
          body.data,
          z.number().parse(body.version),
        );
        break;
      case "hours.save":
        result = await saveHours(sid, body.data);
        break;
      case "leave.save":
        result = await saveLeave(sid, body.data);
        break;
      case "leave.delete":
        result = await removeLeave(sid, z.string().parse(body.id));
        break;
      case "practice.save":
        result = await savePracticeSettings(sid, body.data);
        break;
      case "calendar.feed":
        result = await rotateFeed(sid);
        break;
      default:
        return json({ error: "Nieznana operacja." }, 404);
    }
    return json(result ?? { ok: true });
  } catch (e) {
    return handleError(e);
  }
}
