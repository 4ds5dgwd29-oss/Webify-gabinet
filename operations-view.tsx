"use client";
import Link from "next/link";
import { useState, useRef } from "react";
import { DateTime } from "luxon";
import { CalendarDays, Wallet, UserX, Users, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  PageTitle,
  useResource,
  Loading,
  ErrorMessage,
  Field,
  Select,
  ActionForm,
  Modal,
  value,
  mutate,
  type Appointment,
} from "./workspace-kit";
import { money, appointmentStatuses } from "@/lib/domain";
const methods: Record<string, string> = {
  CASH: "Gotówka",
  TRANSFER: "Przelew",
  BLIK: "BLIK",
  ONLINE: "Online",
};
type Dashboard = {
  name: string;
  practiceName: string;
  timezone: string;
  status: string;
  today: Appointment[];
  revenueGrosze: number;
  noShows: number;
  inactive: Array<{ id: string; firstName: string; lastName: string }>;
};
export function DashboardView() {
  const r = useResource<Dashboard>("dashboard");
  if (!r.data)
    return (
      <>
        <Loading />
        <ErrorMessage message={r.error} />
      </>
    );
  const d = r.data;
  return (
    <>
      <PageTitle
        title={`Dzień dobry, ${d.name.split(" ")[0]}.`}
        description={d.practiceName}
      >
        <Button asChild>
          <Link href="/gabinet/kalendarz">Zaplanuj wizytę</Link>
        </Button>
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Wizyty dzisiaj",
            value: d.today.filter((a) => a.status !== "CANCELLED").length,
            icon: CalendarDays,
          },
          {
            label: "Przychód miesiąca",
            value: money(d.revenueGrosze),
            icon: Wallet,
          },
          { label: "Nieobecności w miesiącu", value: d.noShows, icon: UserX },
          {
            label: "Bez wizyty od 30 dni",
            value: d.inactive.length,
            icon: Users,
          },
        ].map((m) => (
          <Card key={m.label}>
            <div className="flex justify-between text-muted-foreground">
              <p className="text-xs">{m.label}</p>
              <m.icon size={18} />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight">
              {m.value}
            </p>
          </Card>
        ))}
      </div>
      <div className="mt-7 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <div className="mb-6 flex justify-between">
            <h2 className="text-lg font-semibold">Dzisiaj w gabinecie</h2>
            <Link href="/gabinet/kalendarz" className="text-sm text-primary">
              Kalendarz →
            </Link>
          </div>
          {!d.today.length && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Dziś nie masz zaplanowanych wizyt.
            </p>
          )}
          <ul className="divide-y">
            {d.today.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div className="flex gap-4">
                  <span className="font-semibold text-primary">
                    {DateTime.fromISO(a.startsAt)
                      .setZone(d.timezone)
                      .toFormat("HH:mm")}
                  </span>
                  <div>
                    <Link
                      href={`/gabinet/pacjenci/${a.patientId}`}
                      className="font-medium"
                    >
                      {a.patient.firstName} {a.patient.lastName}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.provider.name}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs">
                  {appointmentStatuses[a.status]}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Warto wrócić do kontaktu</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Aktywni pacjenci bez wizyty przez co najmniej 30 dni i bez kolejnego
            terminu.
          </p>
          <ul className="mt-5 divide-y">
            {d.inactive.map((p) => (
              <li key={p.id}>
                <Link
                  className="flex justify-between gap-3 py-4 text-sm"
                  href={`/gabinet/pacjenci/${p.id}`}
                >
                  {p.firstName} {p.lastName}
                  <ArrowUpRight size={16} />
                </Link>
              </li>
            ))}
          </ul>
          {!d.inactive.length && (
            <p className="mt-7 text-sm text-muted-foreground">
              Brak pacjentów na tej liście.
            </p>
          )}
        </Card>
      </div>
      <Card className="mt-6 bg-muted/40">
        <h2 className="font-semibold">Dostosuj gabinet do swojego dnia</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Uzupełnij dane gabinetu, godziny pracy i cennik. Pacjentów możesz
          zaimportować z CSV.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/gabinet/ustawienia">Konfiguracja gabinetu</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/gabinet/cennik">Cennik usług</Link>
          </Button>
        </div>
      </Card>
    </>
  );
}
type Service = {
  id: string;
  name: string;
  durationMinutes: number;
  priceGrosze: number;
  depositGrosze: number;
  active: boolean;
};
export function ServicesView() {
  const r = useResource<Service[]>("services"),
    [editing, setEditing] = useState<Service | "new" | null>(null);
  return (
    <>
      <PageTitle
        title="Cennik usług"
        description="Ustal długość spotkań, ceny i zadatki dla rezerwacji online."
      >
        <Button onClick={() => setEditing("new")}>Dodaj usługę</Button>
      </PageTitle>
      <ErrorMessage message={r.error} />
      <div className="grid gap-4 md:grid-cols-2">
        {r.data?.map((s) => (
          <Card key={s.id}>
            <div className="flex justify-between gap-4">
              <h2 className="font-semibold">{s.name}</h2>
              <span className="text-sm text-muted-foreground">
                {s.active ? "Aktywna" : "Nieaktywna"}
              </span>
            </div>
            <p className="mt-4 text-3xl font-semibold">
              {money(s.priceGrosze)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {s.durationMinutes} minut · Zadatek {money(s.depositGrosze)}
            </p>
            <Button
              className="mt-5"
              variant="outline"
              onClick={() => setEditing(s)}
            >
              Edytuj
            </Button>
          </Card>
        ))}
      </div>
      {editing && (
        <Modal
          title={editing === "new" ? "Nowa usługa" : "Edytuj usługę"}
          onClose={() => setEditing(null)}
        >
          <ActionForm
            onSuccess={() => {
              setEditing(null);
              void r.reload();
            }}
            onSubmit={(f) =>
              mutate(
                "service.save",
                {
                  name: value(f, "name"),
                  durationMinutes: Number(value(f, "duration")),
                  priceGrosze: Math.round(Number(value(f, "price")) * 100),
                  depositGrosze: Math.round(Number(value(f, "deposit")) * 100),
                  active: f.has("active"),
                },
                editing === "new" ? undefined : editing.id,
              )
            }
          >
            <Field
              label="Nazwa"
              name="name"
              defaultValue={editing === "new" ? "" : editing.name}
              required
            />
            <Field
              label="Czas trwania (minuty)"
              name="duration"
              type="number"
              min={10}
              max={480}
              defaultValue={editing === "new" ? 50 : editing.durationMinutes}
              required
            />
            <Field
              label="Cena (zł)"
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={editing === "new" ? 200 : editing.priceGrosze / 100}
              required
            />
            <Field
              label="Zadatek (zł; wymagany przy rezerwacji z zadatkiem)"
              name="deposit"
              type="number"
              min={0}
              step="0.01"
              defaultValue={editing === "new" ? 0 : editing.depositGrosze / 100}
              required
            />
            <label className="flex items-center gap-3 text-sm">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing === "new" ? true : editing.active}
              />
              Usługa aktywna
            </label>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
type Billing = {
  payments: Array<{
    id: string;
    appointmentId: string;
    amountGrosze: number;
    method: string;
    receiptNumber: string;
    paidAt: string;
    voidedAt: string | null;
    patient: { firstName: string; lastName: string };
  }>;
  totalGrosze: number;
  count: number;
  due: Array<{
    id: string;
    name: string;
    startsAt: string;
    remainingGrosze: number;
  }>;
};
export function BillingView() {
  const [month, setMonth] = useState(DateTime.now().toFormat("yyyy-MM")),
    [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const requestId = useRef("");
  const r = useResource<Billing>("billing", { month });
  return (
    <>
      <PageTitle
        title="Rozliczenia"
        description="Wpłaty, należności i przychody gabinetu."
      >
        <Button
          onClick={() => {
            requestId.current = crypto.randomUUID();
            setOpen(true);
          }}
        >
          Zarejestruj wpłatę
        </Button>
      </PageTitle>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Field
          label="Miesiąc"
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
        <Button asChild variant="outline">
          <a href={`/api/pdf?kind=revenue&month=${month}`}>
            Raport miesięczny PDF
          </a>
        </Button>
      </div>
      <ErrorMessage message={error || r.error} />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm text-muted-foreground">Wpłaty w miesiącu</p>
          <p className="mt-3 text-3xl font-semibold">
            {money(r.data?.totalGrosze ?? 0)}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted-foreground">Liczba wpłat</p>
          <p className="mt-3 text-3xl font-semibold">{r.data?.count ?? 0}</p>
        </Card>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Rejestr wpłat</caption>
          <thead>
            <tr className="border-b text-muted-foreground">
              {["Pacjent", "Kwota", "Metoda", "Data", "Dokument", ""].map(
                (s, i) => (
                  <th className="p-3 font-medium" key={i}>
                    {s}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {r.data?.payments.map((p) => (
              <tr
                key={p.id}
                className={`border-b ${p.voidedAt ? "opacity-50" : ""}`}
              >
                <td className="p-3">
                  {p.patient.firstName} {p.patient.lastName}
                  {p.voidedAt && " (anulowano)"}
                </td>
                <td className="whitespace-nowrap p-3 font-semibold">
                  {money(p.amountGrosze)}
                </td>
                <td className="p-3">{methods[p.method]}</td>
                <td className="whitespace-nowrap p-3">
                  {DateTime.fromISO(p.paidAt).toFormat("dd.LL.yyyy")}
                </td>
                <td className="p-3">
                  <a
                    href={`/api/pdf?kind=receipt&id=${p.id}`}
                    className="text-primary underline"
                  >
                    {p.receiptNumber}
                  </a>
                </td>
                <td className="p-3">
                  {!p.voidedAt && p.method !== "ONLINE" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await mutate("payment.void", undefined, p.id);
                          void r.reload();
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Anuluj wpis
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!r.data?.payments.length && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Brak wpłat w wybranym miesiącu.
          </p>
        )}
      </Card>
      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-semibold">
          Należności i płatności online
        </h2>
        {r.data?.due.map((a) => (
          <div
            key={a.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t py-3"
          >
            <p className="text-sm">
              {a.name} · {money(a.remainingGrosze)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const result = await mutate<{ url: string }>(
                    "payment.link",
                    undefined,
                    a.id,
                  );
                  await navigator.clipboard.writeText(result.url);
                  setError("Link do płatności skopiowany.");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Kopiuj link do płatności
            </Button>
          </div>
        ))}
      </Card>
      {open && r.data && (
        <Modal title="Zarejestruj wpłatę" onClose={() => setOpen(false)}>
          <ActionForm
            onSuccess={() => {
              setOpen(false);
              void r.reload();
            }}
            onSubmit={(f) =>
              mutate("payment.add", {
                appointmentId: value(f, "appointmentId"),
                amountGrosze: Math.round(Number(value(f, "amount")) * 100),
                method: value(f, "method"),
                requestId: requestId.current,
              })
            }
          >
            <Select
              label="Wizyta i pozostała należność"
              name="appointmentId"
              required
            >
              <option value="">Wybierz wizytę</option>
              {r.data.due.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ·{" "}
                  {DateTime.fromISO(a.startsAt).toFormat("dd.LL.yyyy")} ·{" "}
                  {money(a.remainingGrosze)}
                </option>
              ))}
            </Select>
            <Field
              label="Kwota wpłaty (zł)"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
            />
            <Select label="Sposób płatności" name="method">
              <option value="CASH">Gotówka</option>
              <option value="TRANSFER">Przelew</option>
              <option value="BLIK">BLIK przyjęty bezpośrednio</option>
            </Select>
          </ActionForm>
        </Modal>
      )}
    </>
  );
}
type Reminders = {
  emailReminders: boolean;
  smsReminders: boolean;
  emailConfigured: boolean;
  smsConfigured: boolean;
  messages: Array<{
    id: string;
    channel: string;
    status: string;
    attempts: number;
    lastError: string | null;
    createdAt: string;
  }>;
};
export function RemindersView() {
  const r = useResource<Reminders>("reminders");
  if (!r.data)
    return (
      <>
        <Loading />
        <ErrorMessage message={r.error} />
      </>
    );
  const d = r.data;
  const status: Record<string, string> = {
    PENDING: "Oczekuje",
    PROCESSING: "Wysyłanie",
    SENT: "Wysłano",
    FAILED: "Błąd wysyłki",
    CANCELLED: "Anulowano",
  };
  return (
    <>
      <PageTitle
        title="Przypomnienia"
        description="Wiadomości wysyłane 24 godziny przed wizytą, wyłącznie przy zgodzie na kontakt."
      />
      <Card>
        <ActionForm
          onSuccess={() => void r.reload()}
          onSubmit={(f) =>
            mutate("reminders.save", {
              emailReminders: f.has("email"),
              smsReminders: f.has("sms"),
            })
          }
        >
          <label className="flex items-center gap-3">
            <input
              name="email"
              type="checkbox"
              defaultChecked={d.emailReminders}
            />
            Przypomnienia e-mail
          </label>
          <p className="text-xs text-muted-foreground">
            {d.emailConfigured
              ? "Dostawca e-mail jest skonfigurowany."
              : "Wysyłka wymaga konfiguracji dostawcy e-mail przez administratora."}
          </p>
          <label className="flex items-center gap-3">
            <input name="sms" type="checkbox" defaultChecked={d.smsReminders} />
            Przypomnienia SMS
          </label>
          <p className="text-xs text-muted-foreground">
            {d.smsConfigured
              ? "Dostawca SMS jest skonfigurowany."
              : "Wysyłka wymaga konfiguracji dostawcy SMS przez administratora."}
          </p>
        </ActionForm>
      </Card>
      <Card className="mt-6">
        <h2 className="mb-5 text-lg font-semibold">Ostatnie wiadomości</h2>
        <ul className="divide-y">
          {d.messages.map((m) => (
            <li
              className="flex flex-wrap justify-between gap-3 py-4 text-sm"
              key={m.id}
            >
              <span>
                {m.channel === "SMS" ? "SMS" : "E-mail"} ·{" "}
                {DateTime.fromISO(m.createdAt).toFormat("dd.LL.yyyy HH:mm")}
              </span>
              <span>
                {status[m.status] || m.status} · próby: {m.attempts}
              </span>
            </li>
          ))}
        </ul>
        {!d.messages.length && (
          <p className="text-sm text-muted-foreground">
            Brak wiadomości w kolejce.
          </p>
        )}
      </Card>
    </>
  );
}
