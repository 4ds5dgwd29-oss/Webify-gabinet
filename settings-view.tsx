"use client";
import { useState } from "react";
import { DateTime } from "luxon";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  useResource,
  PageTitle,
  Loading,
  ActionForm,
  Field,
  Select,
  Textarea,
  mutate,
  value,
  ErrorMessage,
  type Options,
} from "./workspace-kit";
const days = [
  "Poniedziałek",
  "Wtorek",
  "Środa",
  "Czwartek",
  "Piątek",
  "Sobota",
  "Niedziela",
];
export function SettingsView() {
  const result = useResource<Options>("options"),
    [step, setStep] = useState(1),
    [csv, setCsv] = useState(""),
    [message, setMessage] = useState(""),
    [feed, setFeed] = useState("");
  const [error, setError] = useState("");
  if (!result.data)
    return (
      <>
        <Loading />
        <ErrorMessage message={result.error} />
      </>
    );
  const data = result.data;
  return (
    <>
      <PageTitle
        title="Ustawienia gabinetu"
        description="Dane gabinetu, godziny pracy i szybki import pacjentów."
      />
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          [1, "Dane gabinetu"],
          [2, "Godziny pracy"],
          [3, "Import CSV"],
        ].map(([s, l]) => (
          <Button
            key={s}
            variant={step === s ? "default" : "outline"}
            onClick={() => setStep(Number(s))}
          >
            {s}. {l}
          </Button>
        ))}
      </div>
      <ErrorMessage message={error} />
      {step === 1 && (
        <Card>
          <ActionForm
            onSuccess={() => {
              void result.reload();
              setStep(2);
            }}
            onSubmit={(f) =>
              mutate("practice.save", {
                name: value(f, "name"),
                address: value(f, "address"),
                taxId: value(f, "taxId"),
                timezone: value(f, "timezone"),
              })
            }
          >
            <Field
              label="Nazwa gabinetu"
              name="name"
              defaultValue={data.practiceName}
              required
            />
            <Field
              label="Adres gabinetu"
              name="address"
              defaultValue={data.address}
            />
            <Field label="NIP" name="taxId" defaultValue={data.taxId} />
            <Field
              label="Strefa czasowa"
              name="timezone"
              defaultValue={data.timezone}
              required
            />
          </ActionForm>
        </Card>
      )}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-6 text-lg font-semibold">Godziny pracy</h2>
            <ActionForm
              onSuccess={() => void result.reload()}
              onSubmit={(f) => {
                const minute = (s: string) => {
                  const [h, m] = s.split(":").map(Number);
                  return h * 60 + m;
                };
                return mutate("hours.save", {
                  providerId: value(f, "providerId"),
                  hours: days.flatMap((_, i) =>
                    f.has(`day${i}`)
                      ? [
                          {
                            weekday: i + 1,
                            startMinute: minute(value(f, `start${i}`)),
                            endMinute: minute(value(f, `end${i}`)),
                          },
                        ]
                      : [],
                  ),
                });
              }}
            >
              <Select label="Prowadzący" name="providerId">
                {data.providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted-foreground">
                Zapis zastąpi tygodniowy harmonogram wybranego prowadzącego.
                Wizyty już zaplanowane pozostaną w kalendarzu.
              </p>
              {days.map((day, i) => (
                <div
                  key={day}
                  className="grid grid-cols-[1fr_100px_100px] items-center gap-3"
                >
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name={`day${i}`}
                      defaultChecked={i < 5}
                    />
                    {day}
                  </label>
                  <input
                    aria-label={`${day} od`}
                    name={`start${i}`}
                    type="time"
                    defaultValue="09:00"
                    className="rounded border bg-background p-2"
                  />
                  <input
                    aria-label={`${day} do`}
                    name={`end${i}`}
                    type="time"
                    defaultValue="17:00"
                    className="rounded border bg-background p-2"
                  />
                </div>
              ))}
            </ActionForm>
            <details className="mt-6 text-sm">
              <summary>Aktualny harmonogram</summary>
              <ul className="mt-3 space-y-2">
                {data.hours.map((h, i) => (
                  <li key={i}>
                    {data.providers.find((p) => p.id === h.providerId)?.name} ·{" "}
                    {days[h.weekday - 1]} ·{" "}
                    {String(Math.floor(h.startMinute / 60)).padStart(2, "0")}:
                    {String(h.startMinute % 60).padStart(2, "0")}–
                    {String(Math.floor(h.endMinute / 60)).padStart(2, "0")}:
                    {String(h.endMinute % 60).padStart(2, "0")}
                  </li>
                ))}
              </ul>
            </details>
          </Card>
          <Card>
            <h2 className="mb-5 text-lg font-semibold">Urlop / nieobecność</h2>
            <ActionForm
              onSuccess={() => void result.reload()}
              onSubmit={(f) =>
                mutate("leave.save", {
                  providerId: value(f, "providerId"),
                  label: value(f, "label"),
                  startsAt: DateTime.fromISO(value(f, "start"), {
                    zone: data.timezone,
                  })
                    .startOf("day")
                    .toUTC()
                    .toISO(),
                  endsAt: DateTime.fromISO(value(f, "end"), {
                    zone: data.timezone,
                  })
                    .plus({ days: 1 })
                    .startOf("day")
                    .toUTC()
                    .toISO(),
                })
              }
            >
              <Select label="Prowadzący" name="providerId">
                {data.providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Od" name="start" type="date" required />
                <Field label="Do (włącznie)" name="end" type="date" required />
                <Field
                  label="Opis"
                  name="label"
                  defaultValue="Urlop"
                  required
                />
              </div>
            </ActionForm>
            <ul className="mt-6 divide-y">
              {data.leaves.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 py-4 text-sm"
                >
                  <span>
                    {l.label} ·{" "}
                    {DateTime.fromISO(l.startsAt)
                      .setZone(data.timezone)
                      .toFormat("dd.LL.yyyy")}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await mutate("leave.delete", undefined, l.id);
                        void result.reload();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    Usuń
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="font-semibold">Subskrypcja kalendarza iCal</h2>
            <p className="my-4 text-sm text-muted-foreground">
              Link pozwala synchronizować terminy bez danych pacjentów. Traktuj
              go jak hasło. Wygenerowanie nowego unieważnia poprzedni.
            </p>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await mutate<{ token: string }>("calendar.feed");
                  setFeed(`${window.location.origin}/kalendarz/${r.token}`);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Wygeneruj nowy link
            </Button>
            {feed && (
              <p className="mt-4 select-all break-all rounded border p-3 text-sm">
                {feed}
              </p>
            )}
          </Card>
        </div>
      )}
      {step === 3 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Import pacjentów</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            UTF-8, maksymalnie 500 wierszy. Kolumny:
            imie,nazwisko,email,telefon,data_urodzenia. Zgody należy uzupełnić
            oddzielnie. Duplikaty e-mail w tym gabinecie zostaną pominięte.
          </p>
          <ActionForm
            submit="Importuj pacjentów"
            onSubmit={async () => {
              const r = await mutate<{ imported: number; skipped: number }>(
                "patient.import",
                csv,
              );
              setMessage(
                `Zaimportowano: ${r.imported}. Pominięto: ${r.skipped}.`,
              );
            }}
          >
            <Field
              label="Plik CSV"
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  if (file.size > 200000) {
                    setError("Plik może mieć maksymalnie 200 KB.");
                    return;
                  }
                  setCsv(await file.text());
                }
              }}
            />
            <Textarea
              label="Podgląd CSV"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              required
            />
            {message && (
              <p role="status" className="text-sm text-primary">
                {message}
              </p>
            )}
          </ActionForm>
        </Card>
      )}
    </>
  );
}
