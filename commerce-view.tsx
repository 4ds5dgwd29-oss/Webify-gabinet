"use client";
import { useEffect, useState } from "react";
import {
  ActionForm,
  Field,
  Select,
  Textarea,
  PageTitle,
  ErrorMessage,
  Loading,
  useResource,
  mutate,
  value,
} from "./workspace-kit";
import { Button } from "./ui/button";
import { money } from "@/lib/domain";
type Commerce = {
  slug: string;
  status: string;
  planCode: string;
  patientLimit: number;
  userLimit: number;
  bookingEnabled: boolean;
  bookingMode: string;
  bookingPrivacy: string;
  bookingTerms: string;
  p24Configured: boolean;
  stripeConfigured: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  plans: Array<{
    code: string;
    name: string;
    monthlyGrosze: number;
    yearlyGrosze: number;
    patientLimit: number;
    userLimit: number;
  }>;
};
export function CommerceView() {
  const { data, error, reload } = useResource<Commerce>("commerce");
  const [message, setMessage] = useState("");
  async function go(action: string, d?: unknown) {
    try {
      const r = await mutate<{ url: string }>(action, d);
      window.location.assign(r.url);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
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
        title="Subskrypcja i rezerwacje"
        description="Abonament Webify oraz płatności pacjentów."
      />
      <ErrorMessage message={message} />
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-xl">Twój plan: {data.planCode}</h2>
        <p className="my-3">
          Limit: {data.patientLimit} pacjentów i {data.userLimit} użytkowników.
        </p>
        <Button onClick={() => go("stripe.portal")}>
          Portal płatności i faktury
        </Button>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {data.plans.map((p) => (
            <div key={p.code} className="rounded-xl border p-4">
              <h3 className="text-xl">{p.name}</h3>
              <p>
                {p.patientLimit} pacjentów · {p.userLimit} osób
              </p>
              <p className="my-3">{money(p.monthlyGrosze)}/miesiąc</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() =>
                    go("stripe.checkout", { code: p.code, yearly: false })
                  }
                >
                  Miesięcznie
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    go("stripe.checkout", { code: p.code, yearly: true })
                  }
                >
                  Rocznie {money(p.yearlyGrosze)}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {!data.stripeConfigured && (
          <p className="mt-4 text-sm">
            Operator platformy musi skonfigurować Stripe przed zakupem.
          </p>
        )}
      </section>
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 text-xl">Rezerwacja online</h2>
        <a href={`/rezerwacja/${data.slug}`} className="text-primary underline">
          Otwórz stronę rezerwacji
        </a>
        <ActionForm
          onSuccess={reload}
          onSubmit={(f) =>
            mutate("commerce.save", {
              bookingEnabled: f.has("enabled"),
              bookingMode: value(f, "mode"),
              bookingPrivacy: value(f, "privacy"),
              bookingTerms: value(f, "terms"),
              ...(value(f, "apiKey")
                ? {
                    credentials: {
                      merchantId: Number(value(f, "merchant")),
                      posId: Number(value(f, "pos")),
                      apiKey: value(f, "apiKey"),
                      crc: value(f, "crc"),
                      sandbox: f.has("sandbox"),
                    },
                  }
                : {}),
            })
          }
        >
          <label className="mt-5 flex gap-2">
            <input
              type="checkbox"
              name="enabled"
              defaultChecked={data.bookingEnabled}
            />
            Udostępnij publiczną rezerwację
          </label>
          <Select
            label="Płatność podczas rezerwacji"
            name="mode"
            defaultValue={data.bookingMode}
          >
            <option value="NONE">Bez przedpłaty</option>
            <option value="DEPOSIT">Zadatek z cennika</option>
            <option value="FULL">Pełna kwota</option>
          </Select>
          <Textarea
            label="Polityka prywatności rezerwacji"
            name="privacy"
            defaultValue={data.bookingPrivacy || ""}
          />
          <Textarea
            label="Warunki rezerwacji i odwołania"
            name="terms"
            defaultValue={data.bookingTerms || ""}
          />
          <h3 className="font-semibold">Przelewy24 — konto Twojego gabinetu</h3>
          <p className="text-sm">
            {data.p24Configured
              ? "Dane zapisane. Puste pola pozostawią aktualne klucze."
              : "Wprowadź klucze z panelu operatora."}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Merchant ID" name="merchant" type="number" />
            <Field label="POS ID" name="pos" type="number" />
            <Field
              label="Klucz API"
              name="apiKey"
              type="password"
              autoComplete="off"
            />
            <Field
              label="Klucz CRC"
              name="crc"
              type="password"
              autoComplete="off"
            />
          </div>
          <label className="flex gap-2">
            <input type="checkbox" name="sandbox" defaultChecked />
            Środowisko testowe Przelewy24
          </label>
        </ActionForm>
      </section>
      <OnlineOrdersView />
    </>
  );
}
type Slots = {
  name: string;
  timezone: string;
  mode: string;
  privacy: string;
  terms: string;
  services: Array<{
    id: string;
    name: string;
    priceGrosze: number;
    depositGrosze: number;
  }>;
  providers: Array<{ id: string; name: string }>;
  slots: Array<{ providerId: string; startsAt: string }>;
};
export function BookingView({ slug }: { slug: string }) {
  const [data, setData] = useState<Slots>(),
    [service, setService] = useState(""),
    [day, setDay] = useState(""),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [retry, setRetry] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/rezerwacja?${new URLSearchParams({ slug, service, day })}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
        setError("");
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [slug, service, day]);
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <PageTitle
        eyebrow="Webify · Rezerwacja online"
        title={data?.name || "Umów wizytę"}
      />
      <ErrorMessage message={error} />
      {retry ? (
        <section className="space-y-5">
          <p>
            Termin oczekuje na wpłatę przez 15 minut. Połączenie z operatorem
            nie powiodło się.
          </p>
          <Button
            onClick={async () => {
              try {
                const r = await fetch("/api/rezerwacja", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "retry", id: retry }),
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                window.location.assign(d.url);
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Ponów płatność
          </Button>
        </section>
      ) : done ? (
        <p role="status" className="rounded-xl border p-6">
          Wizyta została zarezerwowana. W razie zmiany planów skontaktuj się z
          gabinetem.
        </p>
      ) : (
        data && (
          <ActionForm
            submit="Zarezerwuj termin"
            onSubmit={async (f) => {
              const slot = JSON.parse(value(f, "slot"));
              const r = await fetch("/api/rezerwacja", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  slug,
                  serviceId: service || data.services[0]?.id,
                  ...slot,
                  firstName: value(f, "firstName"),
                  lastName: value(f, "lastName"),
                  email: value(f, "email"),
                  phone: value(f, "phone"),
                  consent: f.has("consent"),
                }),
              });
              const result = await r.json();
              if (!r.ok) throw new Error(result.error);
              if (result.url) window.location.assign(result.url);
              else if (result.retryId) setRetry(result.retryId);
              else setDone(true);
            }}
          >
            <Select
              label="Usługa"
              value={service || data.services[0]?.id}
              onChange={(e) => setService(e.target.value)}
            >
              {data.services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {money(s.priceGrosze)}
                  {data.mode === "DEPOSIT"
                    ? ` · zadatek ${money(s.depositGrosze)}`
                    : ""}
                </option>
              ))}
            </Select>
            <Field
              label="Dzień"
              type="date"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            />
            <Select
              label={`Dostępne terminy (${data.timezone})`}
              name="slot"
              required
            >
              <option value="">Wybierz termin</option>
              {data.slots.map((s) => (
                <option
                  key={s.providerId + s.startsAt}
                  value={JSON.stringify(s)}
                >
                  {new Date(s.startsAt).toLocaleString("pl-PL", {
                    timeZone: data.timezone,
                  })}{" "}
                  · {data.providers.find((p) => p.id === s.providerId)?.name}
                </option>
              ))}
            </Select>
            {!data.slots.length && (
              <p>Brak wolnych terminów. Wybierz inny dzień.</p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Imię" name="firstName" required />
              <Field label="Nazwisko" name="lastName" required />
            </div>
            <Field label="Adres e-mail" type="email" name="email" required />
            <Field label="Telefon" type="tel" name="phone" />
            <details>
              <summary>Polityka prywatności i warunki rezerwacji</summary>
              <p className="whitespace-pre-wrap py-4">{data.privacy}</p>
              <p className="whitespace-pre-wrap">{data.terms}</p>
            </details>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" required name="consent" />
              Akceptuję warunki rezerwacji, zapoznałem/am się z polityką
              prywatności i zgadzam się na kontakt dotyczący wizyty.
            </label>
            {data.mode !== "NONE" && (
              <p className="text-sm">
                Termin oczekuje na wpłatę przez 15 minut. Nieopłacona rezerwacja
                wygaśnie.
              </p>
            )}
          </ActionForm>
        )
      )}
    </main>
  );
}

function OnlineOrdersView() {
  const { data, error, reload } =
    useResource<
      Array<{
        id: string;
        status: string;
        amountGrosze: number;
        providerOrderId: number | null;
        createdAt: string;
      }>
    >("onlineOrders");
  return (
    <section className="mt-6 rounded-xl border bg-card p-6">
      <h2 className="mb-4 text-xl">Płatności online pacjentów</h2>
      <ErrorMessage message={error} />
      {data?.map((o) => (
        <div key={o.id} className="border-t py-4">
          <p>
            {money(o.amountGrosze)} ·{" "}
            {{
              PENDING: "Oczekuje",
              PAID: "Opłacona",
              REVIEW: "Wymaga uzgodnienia",
              REFUNDED_EXTERNALLY: "Zwrot potwierdzony w panelu operatora",
            }[o.status] || o.status}
          </p>
          <p className="mt-1 break-all text-xs text-muted-foreground">
            {o.id} · Numer operatora: {o.providerOrderId || "brak"}
          </p>
          {o.status === "REVIEW" && (
            <details className="mt-4">
              <summary>Potwierdź zwrot wykonany w Przelewy24</summary>
              <p className="my-4 text-sm">
                Spóźnione lub nadmiarowe wpłaty wymagają zwrotu w panelu
                operatora. Ten formularz zapisuje potwierdzenie ręcznego
                uzgodnienia; nie wykonuje przelewu.
              </p>
              <ActionForm
                onSuccess={reload}
                submit="Zapisz potwierdzenie zwrotu"
                onSubmit={(f) =>
                  mutate("order.resolve", {
                    id: o.id,
                    password: value(f, "password"),
                    confirmedRefund: f.has("confirmed"),
                  })
                }
              >
                <Field
                  label="Twoje hasło"
                  name="password"
                  type="password"
                  required
                />
                <label className="flex gap-2">
                  <input name="confirmed" type="checkbox" required />
                  Sprawdzono skuteczny zwrot u operatora.
                </label>
              </ActionForm>
            </details>
          )}
        </div>
      ))}
    </section>
  );
}
