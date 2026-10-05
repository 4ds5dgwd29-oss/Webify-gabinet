"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function TotpForm({ enabled }: { enabled: boolean }) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
      null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/konto/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: enabled ? "disable" : setup ? "enable" : "setup",
          password: form.get("password"),
          ...(form.get("otp") ? { otp: form.get("otp") } : {}),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      if (body.reauthenticate) {
        setSetup(null);
        await signOut({ callbackUrl: "/logowanie" });
      } else setSetup(body);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Nie udało się zmienić ustawień.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="mt-6 max-w-lg space-y-5"
      onSubmit={submit}
      aria-busy={busy}
    >
      <label className="block text-sm font-medium" htmlFor="security-password">
        Potwierdź aktualne hasło
        <Input
          id="security-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className="mt-2"
        />
      </label>
      {setup && (
        <div className="rounded-lg border bg-muted p-4">
          <p className="text-sm leading-relaxed">
            W aplikacji uwierzytelniającej dodaj klucz ręcznie, wybierając kod
            zależny od czasu (TOTP). Konfiguracja wygasa po 10 minutach.
          </p>
          <p
            className="mt-3 select-all break-all rounded bg-card p-3 font-mono text-sm"
            aria-label="Klucz konfiguracji 2FA"
          >
            {setup.secret}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Zapisz klucz w bezpiecznym menedżerze haseł. Nie udostępniaj go
            innym osobom.
          </p>
        </div>
      )}
      {(enabled || setup) && (
        <label className="block text-sm font-medium" htmlFor="security-otp">
          Kod z aplikacji
          <Input
            id="security-otp"
            name="otp"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            className="mt-2"
          />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
      <Button disabled={busy} variant={enabled ? "destructive" : "default"}>
        {busy
          ? "Proszę czekać…"
          : enabled
            ? "Wyłącz 2FA"
            : setup
              ? "Potwierdź i włącz 2FA"
              : "Skonfiguruj 2FA"}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Włączenie lub wyłączenie 2FA zakończy wszystkie sesje konta. Użyty kod
        można wykorzystać tylko raz; przed ponownym logowaniem zaczekaj na nowy.
      </p>
    </form>
  );
}
