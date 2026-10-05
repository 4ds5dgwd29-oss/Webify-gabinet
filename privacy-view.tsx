"use client";
import { useState } from "react";
import {
  PageTitle,
  useResource,
  Loading,
  ErrorMessage,
  ActionForm,
  Field,
  Select,
  mutate,
  value,
} from "./workspace-kit";
import { Button } from "./ui/button";
type Privacy = {
  patients: Array<{
    id: string;
    firstName: string;
    lastName: string;
    archivedAt: string | null;
    retentionUntil: string | null;
    legalHold: boolean;
  }>;
  logs: Array<{
    id: string;
    action: string;
    actorId: string;
    resourceId: string;
    createdAt: string;
  }>;
  deletions: number;
};
export function PrivacyView() {
  const { data, error, reload } = useResource<Privacy>("privacy");
  const [selected, setSelected] = useState("");
  if (!data)
    return (
      <>
        <Loading />
        <ErrorMessage message={error} />
      </>
    );
  const p = data.patients.find((p) => p.id === selected);
  return (
    <>
      <PageTitle
        title="Ochrona danych"
        description="Eksport, retencja i audyt dostępu. Okresy przechowywania zatwierdza administrator danych po sprawdzeniu obowiązujących wymogów."
      />
      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-xl">Dokumenty organizacyjne</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Wzory zawierają pola wymagające uzupełnienia. Przed publikacją przekaż
          je prawnikowi do weryfikacji.
        </p>
        <div className="flex flex-wrap gap-3">
          {[
            ["privacy", "Polityka prywatności"],
            ["terms", "Regulamin"],
            ["dpa", "Umowa powierzenia"],
          ].map(([kind, name]) => (
            <Button key={kind} asChild variant="outline">
              <a href={`/api/pdf?kind=legal&template=${kind}`}>{name} · PDF</a>
            </Button>
          ))}
        </div>
      </section>
      <section className="mt-6 space-y-5 rounded-xl border bg-card p-6">
        <h2 className="text-xl">Dane pacjenta</h2>
        <Select
          label="Wybierz kartę"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">Wybierz pacjenta</option>
          {data.patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.firstName} {p.lastName}
              {p.archivedAt ? " · archiwum" : ""}
            </option>
          ))}
        </Select>
        {p && (
          <div key={p.id} className="space-y-6">
            <Button asChild variant="outline">
              <a href={`/api/eksport?id=${p.id}`}>
                Pobierz eksport JSON z dokumentami
              </a>
            </Button>
            <p className="text-sm text-muted-foreground">
              Eksport obejmuje dostępne Ci notatki i ich wersje. Prywatne
              notatki innych autorów eksportują ich autorzy; plik wskazuje
              liczbę pominiętych notatek. Zweryfikuj kompletność i tożsamość
              odbiorcy przed przekazaniem.
            </p>
            <ActionForm
              onSuccess={reload}
              onSubmit={(f) =>
                mutate("retention.save", {
                  patientId: p.id,
                  retentionUntil: new Date(
                    value(f, "date") + "T23:59:59Z",
                  ).toISOString(),
                  legalHold: f.has("hold"),
                  reviewed: f.has("reviewed"),
                })
              }
            >
              <Field
                label="Przechowuj co najmniej do"
                name="date"
                type="date"
                defaultValue={p.retentionUntil?.slice(0, 10) || ""}
                required
              />
              <label className="flex gap-3">
                <input
                  name="hold"
                  type="checkbox"
                  defaultChecked={p.legalHold}
                />
                Blokada usunięcia z przyczyn prawnych lub organizacyjnych
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input name="reviewed" type="checkbox" required />
                Sprawdzono okresy retencji dokumentacji, rozliczeń oraz
                ewentualne roszczenia.
              </label>
            </ActionForm>
            <details className="rounded-xl border border-red-300 p-4">
              <summary className="font-semibold">
                Trwałe usunięcie danych
              </summary>
              <p className="my-4 text-sm">
                Operacja jest nieodwracalna. Wymaga karty w archiwum, upływu
                zatwierdzonej retencji, zdjęcia blokady i uzgodnienia płatności.
                Usuwa też dokumentację kliniczną i rejestr wpłat pacjenta. Audyt
                zachowuje sam identyfikator operacji.
              </p>
              <ActionForm
                submit="Usuń trwale"
                onSuccess={() => {
                  setSelected("");
                  void reload();
                }}
                onSubmit={(f) =>
                  mutate("patient.erase", {
                    patientId: p.id,
                    password: value(f, "password"),
                    confirmation: value(f, "confirmation"),
                    reviewed: f.has("reviewed"),
                  })
                }
              >
                <Field label="Wpisz USUŃ TRWALE" name="confirmation" required />
                <Field
                  label="Twoje hasło"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
                <label className="flex gap-3 text-sm">
                  <input name="reviewed" type="checkbox" required />
                  Zatwierdzam usunięcie po weryfikacji obowiązków
                  przechowywania.
                </label>
              </ActionForm>
            </details>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Pliki oczekujące na usunięcie: {data.deletions}. Dane w kopiach
          zapasowych wygasają zgodnie z polityką kopii. Po odtworzeniu należy
          ponownie zastosować rejestr usunięć.
        </p>
      </section>
      <section className="mt-6 overflow-x-auto rounded-xl border bg-card p-6">
        <h2 className="mb-4 text-xl">Ostatnie 200 zdarzeń audytu</h2>
        <table className="w-full text-left text-xs">
          <thead>
            <tr>
              <th className="p-2">Kiedy</th>
              <th>Kto</th>
              <th>Kod operacji</th>
              <th>Identyfikator zasobu</th>
            </tr>
          </thead>
          <tbody>
            {data.logs.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">
                  {new Date(l.createdAt).toLocaleString("pl-PL")}
                </td>
                <td>{l.actorId || "System"}</td>
                <td>{l.action}</td>
                <td>{l.resourceId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
