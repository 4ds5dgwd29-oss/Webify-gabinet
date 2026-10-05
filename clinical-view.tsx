"use client";
import { useEffect, useRef, useState } from "react";
import { DateTime } from "luxon";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import {
  Modal,
  Loading,
  ErrorMessage,
  ActionForm,
  Field,
  Select,
  Textarea,
  useResource,
  mutate,
  value,
  type Appointment,
} from "./workspace-kit";
import { appointmentStatuses, appointmentTypes } from "@/lib/domain";
type Note = {
  id?: string;
  html: string;
  private: boolean;
  version: number;
  currentVersion?: number;
  canEdit: boolean;
  appointmentId: string | null;
  versions?: Array<{ version: number; createdAt: string }>;
};
type History = {
  timeline: Array<{ id: string; date: string; kind: string; label: string }>;
  timezone: string;
  clinical: boolean;
  appointments: Appointment[];
  notes: Array<{
    id: string;
    appointmentId: string | null;
    private: boolean;
    version: number;
    updatedAt: string;
    author: { name: string };
  }>;
  goals: Array<{ id: string; text: string; status: string; version: number }>;
  plan: { text: string; summary: string; version: number } | null;
  documents: Array<{
    id: string;
    name: string;
    createdAt: string;
    sizeBytes: number;
  }>;
};
function NoteEditor({
  note,
  patientId,
  appointments,
  onClose,
}: {
  note: Note;
  patientId: string;
  appointments: Appointment[];
  onClose: () => void;
}) {
  const editor = useRef<HTMLDivElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    inFlight = useRef(false),
    dirty = useRef(false),
    mounted = useRef(true);
  const current = useRef({ ...note, patientId });
  const [status, setStatus] = useState("Wszystkie zmiany zapisane"),
    [error, setError] = useState(""),
    [privateNote, setPrivateNote] = useState(note.private),
    [templateName, setTemplateName] = useState("");
  const templates =
    useResource<Array<{ id: string; name: string; html: string }>>("templates");
  const [oldHtml, setOldHtml] = useState<string | null>(null);
  useEffect(() => {
    mounted.current = true;
    if (editor.current) editor.current.innerHTML = note.html;
    const before = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", before);
    return () => {
      mounted.current = false;
      window.removeEventListener("beforeunload", before);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [note.html]);
  async function save() {
    if (inFlight.current) return false;
    if (!dirty.current) return true;
    inFlight.current = true;
    setStatus("Zapisywanie…");
    setError("");
    const snapshot = { ...current.current };
    let saved = false;
    try {
      const result = await mutate<{ id: string; version: number }>(
        "note.save",
        {
          id: snapshot.id,
          patientId,
          appointmentId: snapshot.appointmentId,
          html: snapshot.html,
          private: snapshot.private,
          version: snapshot.version,
        },
      );
      current.current.id = result.id;
      current.current.version = result.version;
      dirty.current =
        current.current.html !== snapshot.html ||
        current.current.private !== snapshot.private;
      setStatus(`Zapisano · wersja ${result.version}`);
      saved = true;
      return true;
    } catch (e) {
      setError((e as Error).message);
      setStatus("Zmiany niezapisane");
      return false;
    } finally {
      inFlight.current = false;
      if (
        dirty.current &&
        saved &&
        mounted.current &&
        current.current.version !== snapshot.version
      )
        timer.current = setTimeout(() => void save(), 500);
    }
  }
  function changed() {
    dirty.current = true;
    setStatus("Niezapisane zmiany");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 1200);
  }
  return (
    <Modal
      title={note.id ? "Notatka ze spotkania" : "Nowa notatka"}
      onClose={() =>
        void (async () => {
          if ((await save()) && !dirty.current) onClose();
        })()
      }
    >
      <div className="space-y-4">
        {note.canEdit && (
          <>
            <Select
              label="Przypisz do wizyty"
              disabled={!!note.id}
              defaultValue={note.appointmentId ?? ""}
              onChange={(e) => {
                current.current.appointmentId = e.target.value || null;
                changed();
              }}
            >
              <option value="">Bez przypisania</option>
              {appointments.map((a) => (
                <option key={a.id} value={a.id}>
                  {DateTime.fromISO(a.startsAt).toFormat("dd.LL.yyyy HH:mm")} ·{" "}
                  {appointmentTypes[a.type]}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap items-end gap-2">
              <select
                aria-label="Szablon notatki"
                className="h-10 max-w-full rounded border bg-background px-3 text-sm"
                defaultValue=""
                onChange={(e) => {
                  const t = templates.data?.find(
                    (t) => t.id === e.target.value,
                  );
                  if (t && editor.current) {
                    editor.current.insertAdjacentHTML("beforeend", t.html);
                    current.current.html = editor.current.innerHTML;
                    changed();
                  }
                  e.target.value = "";
                }}
              >
                <option value="">Dodaj szablon…</option>
                {templates.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {[
                ["bold", "Pogrubienie"],
                ["italic", "Kursywa"],
                ["insertUnorderedList", "Lista"],
              ].map(([command, label]) => (
                <Button
                  key={command}
                  variant="outline"
                  size="sm"
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    editor.current?.focus();
                    document.execCommand(command);
                    if (editor.current) {
                      current.current.html = editor.current.innerHTML;
                      changed();
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </>
        )}
        <div
          ref={editor}
          role="textbox"
          aria-label="Treść notatki"
          aria-multiline="true"
          contentEditable={note.canEdit}
          suppressContentEditableWarning
          className="min-h-64 rounded-lg border bg-background p-4 text-sm leading-relaxed outline-primary [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_ul]:list-disc"
          onInput={(e) => {
            current.current.html = e.currentTarget.innerHTML;
            changed();
          }}
          onPaste={(e) => {
            e.preventDefault();
            document.execCommand(
              "insertText",
              false,
              e.clipboardData.getData("text/plain"),
            );
          }}
        />
        {note.canEdit && (
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={privateNote}
              onChange={(e) => {
                setPrivateNote(e.target.checked);
                current.current.private = e.target.checked;
                changed();
              }}
            />
            Tylko dla mnie
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <span role="status" className="text-xs text-muted-foreground">
            {status}
          </span>
          {note.canEdit && (
            <Button size="sm" onClick={() => void save()}>
              Zapisz teraz
            </Button>
          )}
        </div>
        <ErrorMessage message={error} />
        {note.versions && (
          <details>
            <summary className="text-sm font-medium">Historia wersji</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {note.versions.map((v) => (
                <Button
                  key={v.version}
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const r = await fetch(
                        `/api/praktyka?resource=note&id=${note.id}&version=${v.version}`,
                      );
                      const n = await r.json();
                      if (!r.ok) throw new Error(n.error);
                      setOldHtml(n.html);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Wersja {v.version}
                </Button>
              ))}
            </div>
            {oldHtml !== null && (
              <div
                className="mt-4 rounded border bg-muted p-4 text-sm"
                dangerouslySetInnerHTML={{ __html: oldHtml }}
              />
            )}
          </details>
        )}
        {note.canEdit && (
          <details>
            <summary className="text-sm">
              Zapisz układ jako własny szablon
            </summary>
            <Field
              label="Nazwa szablonu"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
            />
            <Button
              className="mt-3"
              variant="outline"
              onClick={async () => {
                try {
                  await mutate("template.save", {
                    name: templateName,
                    html: current.current.html,
                  });
                  setTemplateName("");
                  void templates.reload();
                  setStatus("Szablon zapisany");
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              Zapisz szablon
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Usuń dane pacjenta z treści przed utworzeniem szablonu.
            </p>
          </details>
        )}
      </div>
    </Modal>
  );
}
export function ClinicalView({ patientId }: { patientId: string }) {
  const history = useResource<History>("history", { id: patientId });
  const [tab, setTab] = useState("timeline"),
    [note, setNote] = useState<Note | null>(null),
    [error, setError] = useState("");
  if (!history.data)
    return (
      <>
        <Loading />
        <ErrorMessage message={history.error} />
      </>
    );
  const h = history.data;
  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2">
        {[
          ["timeline", "Oś czasu"],
          ...(h.clinical
            ? [
                ["notes", "Notatki"],
                ["plan", "Plan i cele"],
                ["documents", "Dokumenty"],
              ]
            : []),
        ].map(([v, l]) => (
          <Button
            key={v}
            variant={tab === v ? "default" : "outline"}
            onClick={() => setTab(v)}
          >
            {l}
          </Button>
        ))}
      </div>
      <ErrorMessage message={error} />
      {tab === "timeline" && (
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Historia pracy</h2>
          <ol className="mb-6 space-y-3 border-l pl-4">
            {h.timeline.map((e) => (
              <li key={e.kind + e.id} className="text-sm">
                <span className="text-xs text-muted-foreground">
                  {DateTime.fromISO(e.date)
                    .setZone(h.timezone)
                    .toFormat("dd.LL.yyyy HH:mm")}
                </span>
                <p>
                  {e.kind} ·{" "}
                  {appointmentStatuses[
                    e.label as keyof typeof appointmentStatuses
                  ] || e.label}
                </p>
              </li>
            ))}
          </ol>
          {!h.appointments.length && (
            <p className="text-sm text-muted-foreground">
              Brak wizyt. Zaplanuj pierwsze spotkanie w kalendarzu.
            </p>
          )}
          <ol className="space-y-5 border-l pl-5">
            {h.appointments.map((a) => (
              <li key={a.id}>
                <p className="text-xs text-muted-foreground">
                  {DateTime.fromISO(a.startsAt)
                    .setZone(h.timezone)
                    .toFormat("dd.LL.yyyy · HH:mm")}
                </p>
                <p className="mt-1 font-medium">
                  {appointmentTypes[a.type]} · {appointmentStatuses[a.status]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.provider.name}
                </p>
                {h.clinical && a.status === "COMPLETED" && (
                  <a
                    className="mt-2 inline-block text-sm text-primary underline"
                    href={`/api/pdf?kind=attendance&patientId=${patientId}&appointmentId=${a.id}`}
                  >
                    Zaświadczenie PDF
                  </a>
                )}
              </li>
            ))}
          </ol>
        </Card>
      )}
      {tab === "notes" && h.clinical && (
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Notatki ze spotkań</h2>
            <Button
              onClick={() =>
                setNote({
                  html: "<p></p>",
                  private: false,
                  version: 0,
                  canEdit: true,
                  appointmentId: null,
                })
              }
            >
              Nowa notatka
            </Button>
          </div>
          <ul className="divide-y">
            {h.notes.map((n) => (
              <li
                key={n.id}
                className="flex flex-wrap items-center justify-between gap-4 py-4"
              >
                <div>
                  <p className="font-medium">
                    {DateTime.fromISO(n.updatedAt).toFormat("dd.LL.yyyy HH:mm")}
                    {n.private ? " · Tylko dla mnie" : ""}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {n.author.name} · wersja {n.version}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const r = await fetch(
                        `/api/praktyka?resource=note&id=${n.id}`,
                      );
                      const body = await r.json();
                      if (!r.ok) throw new Error(body.error);
                      setNote(body);
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  Otwórz
                </Button>
              </li>
            ))}
          </ul>
          {!h.notes.length && (
            <p className="text-sm text-muted-foreground">
              Nie zapisano jeszcze notatek.
            </p>
          )}
        </Card>
      )}
      {tab === "plan" && h.clinical && (
        <div className="space-y-6">
          <Card>
            <h2 className="mb-5 text-lg font-semibold">
              Plan terapii i podsumowanie
            </h2>
            <ActionForm
              key={h.plan?.version ?? 0}
              onSuccess={() => void history.reload()}
              onSubmit={(f) =>
                mutate("plan.save", {
                  patientId,
                  text: value(f, "text"),
                  summary: value(f, "summary"),
                  version: h.plan?.version ?? 0,
                })
              }
            >
              <Textarea
                label="Plan terapii"
                name="text"
                defaultValue={h.plan?.text ?? ""}
              />
              <Textarea
                label="Podsumowanie pracy"
                name="summary"
                defaultValue={h.plan?.summary ?? ""}
              />
            </ActionForm>
          </Card>
          <Card>
            <h2 className="mb-5 text-lg font-semibold">Cele terapeutyczne</h2>
            <ul className="mb-6 divide-y">
              {h.goals.map((g) => (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <p className="max-w-lg whitespace-pre-wrap text-sm">
                    {g.text}
                  </p>
                  <select
                    aria-label="Status celu"
                    className="rounded border bg-background p-2 text-sm"
                    value={g.status}
                    onChange={async (e) => {
                      try {
                        await mutate("goal.save", {
                          id: g.id,
                          patientId,
                          text: g.text,
                          status: e.target.value,
                          version: g.version,
                        });
                        void history.reload();
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    <option value="ACTIVE">W trakcie</option>
                    <option value="ACHIEVED">Osiągnięty</option>
                    <option value="PAUSED">Wstrzymany</option>
                  </select>
                </li>
              ))}
            </ul>
            <ActionForm
              submit="Dodaj cel"
              onSuccess={() => void history.reload()}
              onSubmit={(f) =>
                mutate("goal.save", {
                  patientId,
                  text: value(f, "text"),
                  status: "ACTIVE",
                  version: 0,
                })
              }
            >
              <Textarea
                label="Nowy cel"
                name="text"
                required
                maxLength={5000}
              />
            </ActionForm>
          </Card>
        </div>
      )}
      {tab === "documents" && h.clinical && (
        <Card>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Dokumenty pacjenta</h2>
            <Button asChild variant="outline">
              <a href={`/api/pdf?kind=consent&patientId=${patientId}`}>
                Wzór zgody PDF
              </a>
            </Button>
          </div>
          <ActionForm
            submit="Dodaj dokument"
            onSuccess={() => void history.reload()}
            onSubmit={async (f) => {
              const file = f.get("file");
              if (!(file instanceof File) || !file.size)
                throw new Error("Wybierz plik.");
              if (file.size > 10 * 1024 * 1024)
                throw new Error("Maksymalny rozmiar pliku to 10 MB.");
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1]);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              const r = await fetch("/api/dokumenty", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  patientId,
                  name: file.name,
                  mimeType: file.type || "text/plain",
                  base64,
                }),
              });
              if (!r.ok) throw new Error((await r.json()).error);
            }}
          >
            <Field
              label="Plik PDF, PNG, JPEG lub TXT (do 10 MB)"
              name="file"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.txt"
              required
            />
          </ActionForm>
          <ul className="mt-6 divide-y">
            {h.documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="break-all text-sm font-medium">{d.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {Math.ceil(d.sizeBytes / 1024)} KB ·{" "}
                    {DateTime.fromISO(d.createdAt).toFormat("dd.LL.yyyy")}
                  </p>
                </div>
                <a
                  href={`/api/dokumenty/${d.id}`}
                  className="text-sm font-semibold text-primary"
                >
                  Pobierz
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {note && (
        <NoteEditor
          note={note}
          patientId={patientId}
          appointments={h.appointments}
          onClose={() => {
            setNote(null);
            void history.reload();
          }}
        />
      )}
    </>
  );
}
