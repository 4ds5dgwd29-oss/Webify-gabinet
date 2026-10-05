"use client";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import { patientStatuses } from "@/lib/domain";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import {
  useResource,
  mutate,
  PageTitle,
  Modal,
  Field,
  Select,
  ActionForm,
  value,
  ErrorMessage,
  Loading,
  type Patient,
} from "./workspace-kit";
export function PatientForm({
  patient,
  onSaved,
}: {
  patient?: Patient;
  onSaved: () => void;
}) {
  return (
    <ActionForm
      submit={patient ? "Zapisz kartę" : "Dodaj pacjenta"}
      onSuccess={onSaved}
      onSubmit={(f) =>
        mutate(
          "patient.save",
          {
            firstName: value(f, "firstName"),
            lastName: value(f, "lastName"),
            email: value(f, "email"),
            phone: value(f, "phone"),
            birthDate: value(f, "birthDate"),
            emergencyName: value(f, "emergencyName"),
            emergencyPhone: value(f, "emergencyPhone"),
            status: value(f, "status"),
            tags: value(f, "tags")
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            consentData: f.has("consentData"),
            consentContact: f.has("consentContact"),
            consentRecording: f.has("consentRecording"),
          },
          patient?.id,
          patient?.version,
        )
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Imię"
          name="firstName"
          defaultValue={patient?.firstName}
          required
          maxLength={100}
        />
        <Field
          label="Nazwisko"
          name="lastName"
          defaultValue={patient?.lastName}
          required
          maxLength={100}
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          defaultValue={patient?.email ?? ""}
        />
        <Field
          label="Telefon"
          name="phone"
          type="tel"
          defaultValue={patient?.phone ?? ""}
        />
        <Field
          label="Data urodzenia"
          name="birthDate"
          type="date"
          max={new Date().toISOString().slice(0, 10)}
          defaultValue={patient?.birthDate?.slice(0, 10) ?? ""}
        />
        <Select
          label="Status"
          name="status"
          defaultValue={patient?.status ?? "ACTIVE"}
        >
          {Object.entries(patientStatuses).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </Select>
        <Field
          label="Kontakt awaryjny — imię i nazwisko"
          name="emergencyName"
          defaultValue={patient?.emergencyName ?? ""}
        />
        <Field
          label="Telefon awaryjny"
          name="emergencyPhone"
          type="tel"
          defaultValue={patient?.emergencyPhone ?? ""}
        />
      </div>
      <Field
        label="Tagi (oddziel przecinkiem)"
        name="tags"
        defaultValue={patient?.tags.join(", ") ?? ""}
      />
      <fieldset className="space-y-3 rounded-xl border p-4">
        <legend className="px-2 text-sm font-semibold">
          Zarejestrowane zgody pacjenta
        </legend>
        {[
          ["consentData", "Przetwarzanie danych (RODO)"],
          ["consentContact", "Kontakt i przypomnienia"],
          ["consentRecording", "Nagrywanie spotkań"],
        ].map(([name, label]) => (
          <label key={name} className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              name={name}
              defaultChecked={Boolean(patient?.[name as "consentData"])}
              className="h-4 w-4"
            />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-muted-foreground">
        Oznacz zgodę dopiero po jej uzyskaniu. Dokument potwierdzający możesz
        dodać do karty pacjenta.
      </p>
    </ActionForm>
  );
}
export function PatientsView() {
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [archived, setArchived] = useState(false),
    [page, setPage] = useState(1),
    [tag, setTag] = useState(""),
    [open, setOpen] = useState(false);
  const result = useResource<{ items: Patient[]; total: number; page: number }>(
    "patients",
    { search, status, archived: String(archived), page: String(page), tag },
  );
  return (
    <>
      <PageTitle
        title="Pacjenci"
        description="Kontakty, zgody i historia pracy w jednym miejscu."
      >
        <Button onClick={() => setOpen(true)}>
          <Plus size={17} />
          Dodaj pacjenta
        </Button>
      </PageTitle>
      <Card>
        <div className="grid items-end gap-4 md:grid-cols-[2fr_1fr_1fr_auto]">
          <label className="relative">
            <span className="sr-only">Szukaj pacjenta</span>
            <Search
              className="absolute left-3 top-4 text-muted-foreground"
              size={17}
            />
            <Input
              className="pl-10"
              placeholder="Imię, nazwisko, e-mail lub telefon"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <Select
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Wszystkie</option>
            {Object.entries(patientStatuses).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
          <Field
            label="Tag"
            value={tag}
            onChange={(e) => {
              setTag(e.target.value);
              setPage(1);
            }}
          />
          <label className="flex items-center gap-2 py-3 text-sm">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setPage(1);
              }}
            />
            Archiwum
          </label>
        </div>
      </Card>
      <ErrorMessage message={result.error} />
      {result.loading ? (
        <Loading />
      ) : (
        <div className="mt-5 space-y-3">
          {result.data?.items.map((p) => (
            <Link
              key={p.id}
              href={`/gabinet/pacjenci/${p.id}`}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-5 transition hover:border-primary"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-muted font-medium text-primary">
                  {p.firstName[0]}
                  {p.lastName[0]}
                </span>
                <div>
                  <h2 className="font-semibold">
                    {p.firstName} {p.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {p.phone || p.email || "Brak danych kontaktowych"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-muted px-3 py-1 text-xs">
                  {patientStatuses[p.status]}
                </span>
                <ArrowUpRight size={18} />
              </div>
            </Link>
          ))}
          {result.data?.total === 0 && (
            <Card className="py-12 text-center text-muted-foreground">
              Nie znaleziono pacjentów. Dodaj kartę lub zmień filtry.
            </Card>
          )}
        </div>
      )}
      <div className="mt-6 flex items-center justify-between text-sm">
        <p className="text-muted-foreground">
          Znaleziono: {result.data?.total ?? 0}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Poprzednia
          </Button>
          <span>{page}</span>
          <Button
            variant="outline"
            disabled={page * 25 >= (result.data?.total ?? 0)}
            onClick={() => setPage((p) => p + 1)}
          >
            Następna
          </Button>
        </div>
      </div>
      {open && (
        <Modal title="Nowy pacjent" onClose={() => setOpen(false)}>
          <PatientForm
            onSaved={() => {
              setOpen(false);
              void result.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
export function PatientDetail({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  const result = useResource<Patient>("patient", { id });
  const [edit, setEdit] = useState(false),
    [error, setError] = useState("");
  if (result.loading) return <Loading />;
  if (!result.data) return <ErrorMessage message={result.error} />;
  const p = result.data;
  return (
    <>
      <Link href="/gabinet/pacjenci" className="text-sm text-primary">
        ← Wszyscy pacjenci
      </Link>
      <div className="mt-6">
        <PageTitle
          title={`${p.firstName} ${p.lastName}`}
          description={`${patientStatuses[p.status]}${p.archivedAt ? " · Karta zarchiwizowana" : ""}`}
        >
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await mutate(
                    p.archivedAt ? "patient.restore" : "patient.archive",
                    undefined,
                    id,
                  );
                  void result.reload();
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {p.archivedAt ? "Przywróć" : "Archiwizuj"}
            </Button>
            {!p.archivedAt && (
              <Button onClick={() => setEdit(true)}>Edytuj kartę</Button>
            )}
          </div>
        </PageTitle>
      </div>
      <ErrorMessage message={error} />
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold">Kontakt</h2>
          <p className="mt-3 text-sm">{p.phone || "Telefon: brak"}</p>
          <p className="mt-2 break-all text-sm text-muted-foreground">
            {p.email || "E-mail: brak"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Ur. {p.birthDate?.slice(0, 10) || "nie podano"}
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Kontakt awaryjny</h2>
          <p className="mt-3 text-sm">{p.emergencyName || "Nie podano"}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {p.emergencyPhone}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {p.tags.join(" · ")}
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold">Zgody</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["Dane", p.consentData],
              ["Kontakt", p.consentContact],
              ["Nagrywanie", p.consentRecording],
            ].map(([l, b]) => (
              <li key={String(l)}>
                {b ? "✓" : "—"} {String(l)}
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {children}
      {edit && (
        <Modal title="Edycja karty pacjenta" onClose={() => setEdit(false)}>
          <PatientForm
            patient={p}
            onSaved={() => {
              setEdit(false);
              void result.reload();
            }}
          />
        </Modal>
      )}
    </>
  );
}
