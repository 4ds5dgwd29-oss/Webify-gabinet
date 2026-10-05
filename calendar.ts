import { DateTime } from "luxon";
export function localDate(value: string, zone: string) {
  const dt = DateTime.fromISO(value, { zone });
  if (
    !dt.isValid ||
    dt.toFormat("yyyy-MM-dd'T'HH:mm") !== value ||
    dt.getPossibleOffsets().length !== 1
  )
    throw new Error(
      "Godzina nie istnieje lub jest niejednoznaczna przy zmianie czasu. Wybierz inną godzinę.",
    );
  return dt;
}
export function recurrence(
  localStart: string,
  zone: string,
  duration: number,
  count: number,
  weeks: number,
) {
  const start = localDate(localStart, zone);
  return Array.from({ length: count }, (_, i) => {
    const target = start.plus({ weeks: i * weeks });
    const dt = localDate(target.toFormat("yyyy-MM-dd'T'HH:mm"), zone);
    if (dt.hour !== start.hour || dt.minute !== start.minute)
      throw new Error("Wizyta cykliczna przypada w zmianie czasu.");
    return {
      startsAt: dt.toJSDate(),
      endsAt: dt.plus({ minutes: duration }).toJSDate(),
    };
  });
}
export function overlap(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
) {
  return a.startsAt < b.endsAt && a.endsAt > b.startsAt;
}
export function ical(
  events: Array<{
    id: string;
    startsAt: Date;
    endsAt: Date;
    status: string;
    updatedAt: Date;
  }>,
) {
  const stamp = (date: Date) =>
    date
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  // Bez imion, nazwisk, diagnoz ani notatek w zewnętrznym kalendarzu.
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Webify//Gabinet//PL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((e) => [
      "BEGIN:VEVENT",
      `UID:${e.id}@webify`,
      `DTSTAMP:${stamp(e.updatedAt)}`,
      `LAST-MODIFIED:${stamp(e.updatedAt)}`,
      `DTSTART:${stamp(e.startsAt)}`,
      `DTEND:${stamp(e.endsAt)}`,
      "SUMMARY:Wizyta w gabinecie",
      `STATUS:${e.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED"}`,
      "CLASS:PRIVATE",
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
