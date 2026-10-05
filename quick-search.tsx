"use client";
import { useEffect, useRef, useState } from "react";
import { Search, X, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function QuickSearch({ platform }: { platform: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null),
    [query, setQuery] = useState("");
  const [patients, setPatients] = useState<
    Array<{ id: string; firstName: string; lastName: string }>
  >([]);
  useEffect(() => {
    if (platform || query.length < 2) {
      setPatients([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(
        `/api/praktyka?resource=patients&search=${encodeURIComponent(query)}`,
        { signal: controller.signal },
      )
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d) => setPatients(d.items))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, platform]);
  const pages = platform
    ? [
        { name: "Panel platformy", url: "/platforma" },
        { name: "Bezpieczeństwo konta", url: "/konto" },
      ]
    : [
        { name: "Mój gabinet", url: "/gabinet" },
        { name: "Pacjenci", url: "/gabinet/pacjenci" },
        { name: "Kalendarz wizyt", url: "/gabinet/kalendarz" },
        { name: "Rozliczenia", url: "/gabinet/rozliczenia" },
        { name: "Zespół gabinetu", url: "/gabinet/zespol" },
        { name: "Bezpieczeństwo konta", url: "/konto" },
      ];
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        if (dialog.current?.open) dialog.current.close();
        else dialog.current?.showModal();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setQuery("");
          dialog.current?.showModal();
        }}
        aria-label="Otwórz szybkie wyszukiwanie"
      >
        <Search size={17} />
        <span className="hidden sm:inline">Szybkie przejście</span>
        <kbd className="hidden rounded border px-1.5 text-xs text-muted-foreground md:inline">
          Ctrl K
        </kbd>
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="search-title"
        className="w-[calc(100%-2rem)] max-w-lg rounded-2xl border bg-card p-6 text-foreground shadow-xl backdrop:bg-black/30"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="search-title" className="font-semibold">
            Dokąd chcesz przejść?
          </h2>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Zamknij wyszukiwanie"
            onClick={() => dialog.current?.close()}
          >
            <X size={19} />
          </Button>
        </div>
        <Input
          autoFocus
          aria-label="Szukaj strony"
          placeholder="Szukaj strony lub pacjenta…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="mt-4 space-y-2">
          {pages
            .filter((p) =>
              p.name
                .toLocaleLowerCase("pl")
                .includes(query.toLocaleLowerCase("pl")),
            )
            .map((p) => (
              <li key={p.url}>
                <a
                  href={p.url}
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted"
                >
                  {p.name}
                  <ArrowUpRight size={17} />
                </a>
              </li>
            ))}
          {patients.map((p) => (
            <li key={p.id}>
              <a
                className="block rounded-lg p-3 hover:bg-muted"
                href={`/gabinet/pacjenci/${p.id}`}
              >
                {p.firstName} {p.lastName} · karta pacjenta
              </a>
            </li>
          ))}
        </ul>
        {!pages.some((p) =>
          p.name
            .toLocaleLowerCase("pl")
            .includes(query.toLocaleLowerCase("pl")),
        ) && (
          <p className="p-3 text-sm text-muted-foreground">
            Nie znaleziono strony.
          </p>
        )}
        <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
          Esc — zamknij · Tab — wybierz wynik · Enter — otwórz
        </p>
      </dialog>
    </>
  );
}
