"use client";
import { useState } from "react";
import { DateTime } from "luxon";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { appointmentTypes, appointmentStatuses, money } from "@/lib/domain";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  useResource,
  PageTitle,
  Modal,
  ActionForm,
  Field,
  Select,
  mutate,
  value,
  ErrorMessage,
  Loading,
  type Appointment,
  type Options,
} from "./workspace-kit";
export function AppointmentForm({
  options,
  appointment,
  onSaved,
  patientId,
}: {
  options: Options;
  appointment?: Appointment;
  onSaved: () => void;
  patientId?: string;
}) {
  return (
    <ActionForm
      submit={appointment ? "Zapisz termin" : "Zaplanuj wizytę"}
      onSuccess={onSaved}
      onSubmit={(f) =>
        mutate(
          "appointment.save",
          {
            patientId: value(f, "patientId"),
            providerId: value(f, "providerId"),
            serviceId: value(f, "serviceId") || undefined,
            localStart: value(f, "localStart"),
            durationMinutes: Number(value(f, "durationMinutes")),
            type: value(f, "type"),
            onlineUrl: value(f, "onlineUrl"),
            priceGrosze: Math.round(Number(value(f, "price")) * 100),
            repeatCount: Number(value(f, "repeatCount") || 1),
            repeatWeeks: Number(value(f, "repeatWeeks") || 1),
          },
          appointment?.id,
          appointment?.version,
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Pacjent"
          name="patientId"
          required
          defaultValue={appointment?.patientId ?? patientId ?? ""}
        >
          <option value="">Wybierz pacjenta</option>
          {options.patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
            </option>
          ))}
        </Select>
        <Select
          label="Prowadzący"
          name="providerId"
          required
          defaultValue={appointment?.providerId ?? options.providers[0]?.id}
        >
          {options.providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Field
          label={`Termin (${options.timezone})`}
          type="datetime-local"
          name="localStart"
          required
          defaultValue={
            appointment
              ? DateTime.fromISO(appointment.startsAt)
                  .setZone(options.timezone)
                  .toFormat("yyyy-MM-dd'T'HH:mm")
              : undefined
          }
        />
        <Field
          label="Czas trwania (minuty)"
          type="number"
          name="durationMinutes"
          min={10}
          max={480}
          defaultValue={
            appointment
              ? Math.round(
                  (+new Date(appointment.endsAt) -
                    +new Date(appointment.startsAt)) /
                    60000,
                )
              : 50
          }
          required
        />
        <Select
          label="Rodzaj wizyty"
          name="type"
          defaultValue={appointment?.type ?? "INDIVIDUAL"}
        >
          {Object.entries(appointmentTypes).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Select
          label="Usługa z cennika"
          name="serviceId"
          defaultValue={appointment?.serviceId ?? ""}
        >
          <option value="">Własna cena</option>
          {options.services.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name} — {money(s.priceGrosze)}
            </option>
          ))}
        </Select>
        <Field
          label="Cena własna (zł)"
          name="price"
          type="number"
          min="0"
          step="0.01"
          defaultValue={(appointment?.priceGrosze ?? 20000) / 100}
          required
        />
        <Field
          label="Link do spotkania online (HTTPS)"
          name="onlineUrl"
          type="url"
          defaultValue={appointment?.onlineUrl ?? ""}
        />
        {!appointment && (
          <>
            <Field
              label="Liczba spotkań w cyklu"
              name="repeatCount"
              type="number"
              min={1}
              max={52}
              defaultValue={1}
            />
            <Field
              label="Powtarzaj co (tygodnie)"
              name="repeatWeeks"
              type="number"
              min={1}
              max={12}
              defaultValue={1}
            />
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Cały cykl zostanie zapisany tylko wtedy, gdy wszystkie terminy są
        dostępne. Przy wybraniu usługi obowiązuje jej cena.
      </p>
    </ActionForm>
  );
}
export function CalendarView() {
  const [view, setView] = useState<"day" | "week" | "month">("week"),
    [date, setDate] = useState(
      DateTime.now().setZone("Europe/Warsaw").toISODate()!,
    ),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<Appointment | undefined>(),
    [provider, setProvider] = useState(""),
    [error, setError] = useState("");
  const options = useResource<Options>("options");
  const zone = options.data?.timezone ?? "Europe/Warsaw";
  const base = DateTime.fromISO(date, { zone });
  const start = base.startOf(view),
    end = start.plus(
      view === "day"
        ? { days: 1 }
        : view === "week"
          ? { weeks: 1 }
          : { months: 1 },
    );
  const data = useResource<{ appointments: Appointment[] }>("calendar", {
    from: start.toUTC().toISO()!,
    to: end.toUTC().toISO()!,
  });
  const days = Array.from(
    { length: Math.round(end.diff(start, "days").days) },
    (_, i) => start.plus({ days: i }),
  );
  const events = (data.data?.appointments ?? []).filter(
    (a) => !provider || a.providerId === provider,
  );
  const refresh = () => {
    setOpen(false);
    setSelected(undefined);
    void data.reload();
  };
  return (
    <>
      <PageTitle
        title="Kalendarz"
        description="Zaplanuj dzień z przestrzenią na każdą wizytę."
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a href="/api/kalendarz">Eksport iCal</a>
          </Button>
          <Button
            onClick={() => {
              setSelected(undefined);
              setOpen(true);
            }}
          >
            <Plus size={16} />
            Nowa wizyta
          </Button>
        </div>
      </PageTitle>
      <Card className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Poprzedni okres"
            onClick={() =>
              setDate(
                base
                  .minus(
                    view === "month"
                      ? { months: 1 }
                      : view === "week"
                        ? { weeks: 1 }
                        : { days: 1 },
                  )
                  .toISODate()!,
              )
            }
          >
            <ChevronLeft size={18} />
          </Button>
          <input
            aria-label="Wybrana data"
            className="rounded border bg-background p-2 text-sm"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Następny okres"
            onClick={() =>
              setDate(
                base
                  .plus(
                    view === "month"
                      ? { months: 1 }
                      : view === "week"
                        ? { weeks: 1 }
                        : { days: 1 },
                  )
                  .toISODate()!,
              )
            }
          >
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="flex gap-1">
          {[
            ["day", "Dzień"],
            ["week", "Tydzień"],
            ["month", "Miesiąc"],
          ].map(([v, l]) => (
            <Button
              key={v}
              variant={view === v ? "default" : "ghost"}
              size="sm"
              onClick={() => setView(v as typeof view)}
            >
              {l}
            </Button>
          ))}
        </div>
        <select
          aria-label="Filtr prowadzącego"
          className="rounded border bg-background p-2 text-sm"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          <option value="">Wszyscy prowadzący</option>
          {options.data?.providers.map((p) => (
            <option value={p.id} key={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Card>
      <ErrorMessage message={error || data.error || options.error} />
      {data.loading ? (
        <Loading />
      ) : (
        <div
          className={
            view === "day"
              ? "space-y-4"
              : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          }
        >
          {days.map((day) => (
            <section
              key={day.toISODate()}
              className="min-h-36 rounded-xl border bg-card p-3"
            >
              <h2 className="mb-3 border-b pb-3 text-sm font-semibold">
                {day.setLocale("pl").toFormat("ccc, d LLL")}
              </h2>
              <div className="space-y-2">
                {events
                  .filter((a) =>
                    DateTime.fromISO(a.startsAt)
                      .setZone(zone)
                      .hasSame(day, "day"),
                  )
                  .map((a) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        setSelected(a);
                        setOpen(true);
                      }}
                      className={`w-full rounded-lg border-l-4 border-primary bg-muted p-3 text-left text-sm hover:opacity-80 ${a.status === "CANCELLED" ? "opacity-50" : ""}`}
                    >
                      <span className="font-semibold">
                        {DateTime.fromISO(a.startsAt)
                          .setZone(zone)
                          .toFormat("HH:mm")}{" "}
                        · {a.patient.firstName} {a.patient.lastName}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {appointmentTypes[a.type]} ·{" "}
                        {appointmentStatuses[a.status]}
                      </span>
                    </button>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {open && options.data && (
        <Modal
          title={selected ? "Szczegóły wizyty" : "Nowa wizyta"}
          onClose={() => setOpen(false)}
        >
          {selected && (
            <>
              <div className="mb-6 rounded-xl bg-muted p-4">
                <p className="font-semibold">
                  {selected.patient.firstName} {selected.patient.lastName}
                </p>
                <p className="mt-2 text-sm">
                  {appointmentStatuses[selected.status]} ·{" "}
                  {selected.provider.name} · {money(selected.priceGrosze)}
                </p>
                {selected.onlineUrl && (
                  <a
                    className="mt-3 block text-sm text-primary underline"
                    href={selected.onlineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Otwórz spotkanie online
                  </a>
                )}
              </div>
              {selected.status === "SCHEDULED" && (
                <div className="mb-6 flex flex-wrap gap-2">
                  {[
                    ["COMPLETED", "Odbyta"],
                    ["CANCELLED", "Odwołaj"],
                    ["NO_SHOW", "Nieobecność"],
                  ].map(([s, l]) => (
                    <Button
                      variant="outline"
                      key={s}
                      onClick={async () => {
                        try {
                          await mutate(
                            "appointment.status",
                            s,
                            selected.id,
                            selected.version,
                          );
                          refresh();
                        } catch (e) {
                          setError((e as Error).message);
                          setOpen(false);
                        }
                      }}
                    >
                      {l}
                    </Button>
                  ))}
                </div>
              )}
            </>
          )}
          {(!selected || selected.status === "SCHEDULED") && (
            <AppointmentForm
              options={options.data}
              appointment={selected}
              onSaved={refresh}
            />
          )}
        </Modal>
      )}
    </>
  );
}
