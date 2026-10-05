"use client";
import { useEffect, useState } from "react";
import {
  PageTitle,
  ActionForm,
  Field,
  Textarea,
  Select,
  ErrorMessage,
  Loading,
  value,
  useResource,
  mutate,
} from "./workspace-kit";
import { Button } from "./ui/button";
import { money } from "@/lib/domain";
async function platform(action: string, data: unknown) {
  const r = await fetch("/api/platforma", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, data }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error);
  return d;
}
type Plan = {
  code: string;
  name: string;
  monthlyGrosze: number;
  yearlyGrosze: number;
  patientLimit: number;
  userLimit: number;
  trialDays: number;
  stripeMonthlyId: string;
  stripeYearlyId: string;
  active: boolean;
};
type AdminData = {
  systemLogs: Array<{ id: string; code: string; createdAt: string }>;
  registrations: Array<{ month: string; count: number }>;
  tenants: Array<{
    id: string;
    name: string;
    status: string;
    planCode: string;
    createdAt: string;
    lastActivity: string | null;
  }>;
  plans: Plan[];
  metrics: {
    active: number;
    mrr: number;
    churn30: number;
    cancelled30: number;
    registrations30: number;
  };
  feedback: Array<{
    id: string;
    subject: string;
    message: string;
    status: string;
    tenantId: string;
  }>;
  logs: Array<{
    id: string;
    action: string;
    resourceId: string;
    createdAt: string;
    actorId: string;
  }>;
  coupons: Array<{ id: string; code: string; percentOff: number }>;
};
export function AdminView() {
  const [data, setData] = useState<AdminData>(),
    [error, setError] = useState(""),
    [tab, setTab] = useState("gabinety"),
    [support, setSupport] = useState<{
      id: string;
      data: {
        id: string;
        name: string;
        planCode: string;
        timezone: string;
        users: Array<{
          id: string;
          name: string;
          email: string;
          role: string;
          active: boolean;
        }>;
      };
    }>();
  async function reload() {
    try {
      const r = await fetch("/api/platforma");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void reload();
  }, []);
  if (!data)
    return (
      <>
        <Loading />
        <ErrorMessage message={error} />
      </>
    );
  return (
    <>
      <PageTitle
        eyebrow="Webify · Administracja"
        title="Gabinety na platformie"
        description="Dane administracyjne i rozliczeniowe. Bez danych pacjentów i dokumentacji klinicznej."
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Aktywne gabinety", data.metrics.active],
          ["MRR według cen planów", money(data.metrics.mrr)],
          ["Rejestracje · 30 dni", data.metrics.registrations30],
          ["Anulowania · 30 dni", data.metrics.cancelled30],
        ].map(([label, n]) => (
          <div key={label} className="rounded-xl border bg-card p-5">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl">{n}</p>
          </div>
        ))}
      </div>
      <p className="mb-5 text-xs text-muted-foreground">
        Udział anulowań z 30 dni w sumie aktywnych i anulowanych:{" "}
        {(data.metrics.churn30 * 100).toFixed(1)}%. MRR jest estymacją według
        cennika, bez rabatów i podatków.
      </p>
      <div className="mb-6 flex flex-wrap gap-2">
        {["gabinety", "plany", "rabaty", "opinie", "audyt", "system"].map(
          (t) => (
            <Button
              key={t}
              variant={t === tab ? "default" : "outline"}
              onClick={() => setTab(t)}
            >
              {t[0].toUpperCase() + t.slice(1)}
            </Button>
          ),
        )}
      </div>
      <ErrorMessage message={error} />
      {support && (
        <section className="mb-6 rounded-xl border border-amber-400 bg-card p-5">
          <h2 className="text-xl">Tryb wsparcia: {support.data.name}</h2>
          <p className="my-3 text-sm">
            Podgląd konfiguracji, ważny 15 minut. Każdy odczyt jest
            rejestrowany. Plan {support.data.planCode}, strefa{" "}
            {support.data.timezone}.
          </p>
          {support.data.users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-2 border-t py-3"
            >
              <p>
                {u.name} · {u.email} ·{" "}
                {u.role === "OWNER" ? "Właściciel" : "Recepcja"}
              </p>
              <ActionForm
                submit={u.active ? "Wyłącz konto" : "Włącz konto"}
                onSubmit={() =>
                  platform("user", {
                    tenantId: support.data.id,
                    userId: u.id,
                    active: !u.active,
                  })
                }
                onSuccess={() => setSupport(undefined)}
              >
                {null}
              </ActionForm>
              <ActionForm
                submit="Wyślij reset hasła"
                onSubmit={() =>
                  platform("reset", { tenantId: support.data.id, userId: u.id })
                }
              >
                {null}
              </ActionForm>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={async () => {
              await platform("support.end", support.id);
              setSupport(undefined);
              void reload();
            }}
          >
            Zakończ tryb wsparcia
          </Button>
        </section>
      )}
      {tab === "gabinety" && (
        <div className="space-y-4">
          <details className="rounded-xl border bg-card p-5">
            <summary>Rejestracje w ostatnich 12 miesiącach</summary>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr>
                  <th>Miesiąc</th>
                  <th>Nowe gabinety</th>
                </tr>
              </thead>
              <tbody>
                {data.registrations.map((r) => (
                  <tr key={r.month}>
                    <td>{r.month}</td>
                    <td className="text-center">{r.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
          {data.tenants.map((t) => (
            <section key={t.id} className="rounded-xl border bg-card p-5">
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <p className="my-3 text-sm">
                Plan {t.planCode} · Rejestracja{" "}
                {new Date(t.createdAt).toLocaleDateString("pl-PL")} · Ostatnia
                aktywność:{" "}
                {t.lastActivity
                  ? new Date(t.lastActivity).toLocaleString("pl-PL")
                  : "brak"}
              </p>
              <ActionForm
                onSuccess={reload}
                onSubmit={(f) =>
                  platform("tenant", {
                    id: t.id,
                    status: value(f, "status"),
                    trialDays: Number(value(f, "days")),
                  })
                }
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Select label="Status" name="status" defaultValue={t.status}>
                    <option value="ACTIVE">Aktywny</option>
                    <option value="TRIAL">Okres próbny</option>
                    <option value="READ_ONLY">Tylko odczyt</option>
                    <option value="SUSPENDED">Zawieszony</option>
                  </Select>
                  <Field
                    label="Przedłuż próbę o dni (0 = bez zmiany)"
                    name="days"
                    type="number"
                    defaultValue={0}
                    min={0}
                    max={365}
                  />
                </div>
              </ActionForm>
              <details className="mt-5">
                <summary>Otwórz tryb wsparcia</summary>
                <ActionForm
                  submit="Rozpocznij sesję wsparcia"
                  onSubmit={async (f) => {
                    const result = await platform("support.start", {
                      id: t.id,
                      reason: value(f, "reason"),
                    });
                    const r = await fetch(
                      `/api/platforma?support=${result.id}`,
                    );
                    if (!r.ok) throw new Error("Nie można otworzyć podglądu.");
                    setSupport({ id: result.id, data: await r.json() });
                  }}
                >
                  <Field
                    label="Powód dostępu (minimum 10 znaków)"
                    name="reason"
                    required
                    minLength={10}
                  />
                </ActionForm>
              </details>
            </section>
          ))}
        </div>
      )}
      {tab === "plany" && (
        <div className="space-y-5">
          {[
            ...data.plans,
            {
              code: "",
              name: "",
              monthlyGrosze: 0,
              yearlyGrosze: 0,
              patientLimit: 100,
              userLimit: 1,
              trialDays: 30,
              stripeMonthlyId: "",
              stripeYearlyId: "",
              active: true,
            },
          ].map((p, i) => (
            <section
              key={p.code || i}
              className="rounded-xl border bg-card p-5"
            >
              <h2 className="mb-4 text-xl">{p.name || "Nowy plan"}</h2>
              <ActionForm
                onSuccess={reload}
                onSubmit={(f) =>
                  platform("plan", {
                    code: value(f, "code"),
                    name: value(f, "name"),
                    monthlyGrosze: Math.round(Number(value(f, "month")) * 100),
                    yearlyGrosze: Math.round(Number(value(f, "year")) * 100),
                    patientLimit: Number(value(f, "patients")),
                    userLimit: Number(value(f, "users")),
                    trialDays: Number(value(f, "trial")),
                    stripeMonthlyId: value(f, "monthlyId"),
                    stripeYearlyId: value(f, "yearlyId"),
                    active: f.has("active"),
                  })
                }
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Kod"
                    name="code"
                    defaultValue={p.code}
                    required
                    readOnly={!!p.code}
                  />
                  <Field
                    label="Nazwa"
                    name="name"
                    defaultValue={p.name}
                    required
                  />
                  <Field
                    label="Cena miesięczna (zł)"
                    name="month"
                    type="number"
                    step="0.01"
                    defaultValue={p.monthlyGrosze / 100}
                  />
                  <Field
                    label="Cena roczna (zł)"
                    name="year"
                    type="number"
                    step="0.01"
                    defaultValue={p.yearlyGrosze / 100}
                  />
                  <Field
                    label="Limit pacjentów"
                    name="patients"
                    type="number"
                    defaultValue={p.patientLimit}
                  />
                  <Field
                    label="Limit użytkowników"
                    name="users"
                    type="number"
                    defaultValue={p.userLimit}
                  />
                  <Field
                    label="Dni próby"
                    name="trial"
                    type="number"
                    defaultValue={p.trialDays}
                  />
                  <Field
                    label="Stripe Price ID — miesiąc"
                    name="monthlyId"
                    defaultValue={p.stripeMonthlyId || ""}
                  />
                  <Field
                    label="Stripe Price ID — rok"
                    name="yearlyId"
                    defaultValue={p.stripeYearlyId || ""}
                  />
                </div>
                <label className="flex gap-2">
                  <input
                    name="active"
                    type="checkbox"
                    defaultChecked={p.active}
                  />
                  Plan dostępny w sprzedaży
                </label>
              </ActionForm>
            </section>
          ))}
        </div>
      )}
      {tab === "rabaty" && (
        <section className="rounded-xl border bg-card p-5">
          <ActionForm
            onSuccess={reload}
            submit="Utwórz kod w Stripe"
            onSubmit={(f) =>
              platform("coupon", {
                code: value(f, "code"),
                percentOff: Number(value(f, "percent")),
              })
            }
          >
            <Field
              label="Kod rabatowy"
              name="code"
              required
              pattern="[A-Z0-9_-]{3,30}"
            />
            <Field
              label="Rabat procentowy — pierwsza faktura"
              name="percent"
              type="number"
              min={1}
              max={100}
              required
            />
          </ActionForm>
          {data.coupons.map((c) => (
            <p key={c.id} className="mt-4">
              {c.code} · {c.percentOff}%
            </p>
          ))}
        </section>
      )}
      {tab === "opinie" &&
        data.feedback.map((f) => (
          <section key={f.id} className="mb-4 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">{f.subject}</h2>
            <p className="my-4 whitespace-pre-wrap">{f.message}</p>
            <ActionForm
              onSuccess={reload}
              onSubmit={(form) =>
                platform("feedback", {
                  id: f.id,
                  status: value(form, "status"),
                })
              }
            >
              <Select
                label="Status zgłoszenia"
                name="status"
                defaultValue={f.status}
              >
                <option value="NEW">Nowe</option>
                <option value="IN_PROGRESS">W realizacji</option>
                <option value="DONE">Zamknięte</option>
              </Select>
            </ActionForm>
          </section>
        ))}
      {tab === "system" && (
        <section className="space-y-3 rounded-xl border bg-card p-5">
          <h2 className="text-xl">Logi systemowe</h2>
          <p className="text-sm">
            Kody błędów i identyfikatory korelacji. Bez treści żądań i danych
            pacjentów.
          </p>
          {data.systemLogs.map((l) => (
            <p key={l.id} className="break-all border-t py-3 text-xs">
              {new Date(l.createdAt).toLocaleString("pl-PL")} · {l.code} ·{" "}
              {l.id}
            </p>
          ))}
        </section>
      )}
      {tab === "audyt" && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="p-3">Kiedy</th>
                <th>Kto</th>
                <th>Operacja</th>
                <th>Zasób</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.map((l) => (
                <tr className="border-t" key={l.id}>
                  <td className="p-3">
                    {new Date(l.createdAt).toLocaleString("pl-PL")}
                  </td>
                  <td>{l.actorId || "System"}</td>
                  <td>{l.action}</td>
                  <td>{l.resourceId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export function TeamView() {
  const { data, error, reload } =
    useResource<
      Array<{
        id: string;
        name: string;
        email: string;
        role: string;
        active: boolean;
        twoFactor: boolean;
      }>
    >("team");
  return (
    <>
      <PageTitle
        title="Zespół gabinetu"
        description="Właściciele mają dostęp do dokumentacji klinicznej; recepcja ma dostęp organizacyjny."
      />
      <ErrorMessage message={error} />
      <div className="space-y-4">
        {data?.map((u) => (
          <section key={u.id} className="rounded-xl border bg-card p-5">
            <h2 className="font-semibold">
              <span>{u.name}</span> · {u.email}
            </h2>
            <p className="my-3 text-sm">
              2FA: {u.twoFactor ? "włączone" : "wyłączone"}
            </p>
            <ActionForm
              onSuccess={reload}
              onSubmit={(f) =>
                mutate("team.update", {
                  id: u.id,
                  role: value(f, "role"),
                  active: f.has("active"),
                })
              }
            >
              <Select label="Rola" name="role" defaultValue={u.role}>
                <option value="OWNER">Właściciel / psycholog</option>
                <option value="STAFF">Recepcja / asystent</option>
              </Select>
              <label className="flex gap-2">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={u.active}
                />
                Konto aktywne
              </label>
            </ActionForm>
          </section>
        ))}
      </div>
      <section className="mt-6 rounded-xl border bg-card p-6">
        <h2 className="mb-5 text-xl">Zaproś osobę do zespołu</h2>
        <ActionForm
          onSuccess={reload}
          submit="Wyślij zaproszenie"
          onSubmit={(f) =>
            mutate("team.invite", {
              name: value(f, "name"),
              email: value(f, "email"),
              role: value(f, "role"),
            })
          }
        >
          <Field label="Imię i nazwisko" name="name" required />
          <Field label="Adres e-mail" type="email" name="email" required />
          <Select label="Rola" name="role">
            <option value="STAFF">Recepcja / asystent</option>
            <option value="OWNER">Właściciel / psycholog</option>
          </Select>
        </ActionForm>
      </section>
    </>
  );
}
export function FeedbackView() {
  const { data, error, reload } =
    useResource<
      Array<{ id: string; subject: string; message: string; status: string }>
    >("feedback");
  return (
    <>
      <PageTitle
        title="Twoja opinia"
        description="Pomóż nam rozwijać Webify. Nie umieszczaj w zgłoszeniu danych pacjentów ani treści dokumentacji."
      />
      <section className="rounded-xl border bg-card p-6">
        <ActionForm
          onSuccess={reload}
          submit="Wyślij opinię"
          onSubmit={(f) =>
            mutate("feedback.save", {
              subject: value(f, "subject"),
              message: value(f, "message"),
            })
          }
        >
          <Field
            label="Temat"
            name="subject"
            required
            minLength={3}
            maxLength={150}
          />
          <Textarea
            label="Opis"
            name="message"
            required
            minLength={5}
            maxLength={5000}
          />
        </ActionForm>
      </section>
      <ErrorMessage message={error} />
      {data?.map((f) => (
        <section key={f.id} className="mt-5 rounded-xl border p-5">
          <h2 className="font-semibold">
            {f.subject} ·{" "}
            {
              { NEW: "Nowe", IN_PROGRESS: "W realizacji", DONE: "Zamknięte" }[
                f.status
              ]
            }
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm">{f.message}</p>
        </section>
      ))}
    </>
  );
}
export function PasswordResetView({ token }: { token?: string }) {
  const [message, setMessage] = useState("");
  return (
    <main className="mx-auto max-w-lg p-6 py-20">
      <PageTitle title={token ? "Ustaw nowe hasło" : "Odzyskaj dostęp"} />
      <ActionForm
        submit={token ? "Zmień hasło" : "Wyślij link"}
        onSubmit={async (f) => {
          const r = await fetch("/api/haslo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(
              token
                ? { action: "reset", token, password: value(f, "password") }
                : { action: "request", email: value(f, "email") },
            ),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
          setMessage(d.message);
        }}
      >
        {token ? (
          <Field
            label="Nowe hasło"
            name="password"
            type="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        ) : (
          <Field label="Adres e-mail" name="email" type="email" required />
        )}
      </ActionForm>
      {message && (
        <p role="status" className="my-5">
          {message}
        </p>
      )}
      <a href="/logowanie" className="mt-5 block text-primary underline">
        Wróć do logowania
      </a>
    </main>
  );
}
