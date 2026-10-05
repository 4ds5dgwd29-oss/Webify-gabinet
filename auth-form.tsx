"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function AuthForm({ register = false }: { register?: boolean }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? ""),
      password = String(form.get("password") ?? "");
    try {
      if (register) {
        const response = await fetch("/api/rejestracja", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: form.get("name"),
            practiceName: form.get("practiceName"),
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        setSuccess(body.message);
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          otp: form.get("otp") ?? "",
          redirect: false,
        });
        if (!result?.ok || result.error)
          throw new Error(
            "Nie udało się zalogować. Sprawdź e-mail, hasło i kod 2FA. Po wielu próbach odczekaj 15 minut.",
          );
        window.location.assign("/gabinet");
      }
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Wystąpił błąd. Spróbuj ponownie.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (success)
    return (
      <div role="status" className="rounded-xl border bg-muted p-5">
        <p className="leading-relaxed">{success}</p>
        <Button asChild className="mt-5">
          <a href="/logowanie">
            Przejdź do logowania <ArrowRight size={16} />
          </a>
        </Button>
      </div>
    );
  return (
    <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
      {register && (
        <>
          <label className="block text-sm font-medium" htmlFor="name">
            Imię i nazwisko
            <Input
              id="name"
              name="name"
              className="mt-2"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          </label>
          <label className="block text-sm font-medium" htmlFor="practiceName">
            Nazwa gabinetu
            <Input
              id="practiceName"
              name="practiceName"
              className="mt-2"
              autoComplete="organization"
              required
              minLength={2}
              maxLength={120}
            />
          </label>
        </>
      )}
      <label className="block text-sm font-medium" htmlFor="email">
        Adres e-mail
        <Input
          id="email"
          name="email"
          type="email"
          className="mt-2"
          autoComplete="username"
          placeholder="twoj@email.pl"
          required
          maxLength={254}
        />
      </label>
      <label className="block text-sm font-medium" htmlFor="password">
        Hasło
        <Input
          id="password"
          name="password"
          type="password"
          className="mt-2"
          autoComplete={register ? "new-password" : "current-password"}
          required
          minLength={register ? 12 : 1}
          maxLength={128}
          aria-describedby={register ? "password-help" : undefined}
        />
      </label>
      {register ? (
        <p id="password-help" className="text-xs text-muted-foreground">
          Co najmniej 12 znaków. Najlepiej użyj długiej, unikalnej frazy.
        </p>
      ) : (
        <label className="block text-sm font-medium" htmlFor="otp">
          Kod 2FA{" "}
          <span className="font-normal text-muted-foreground">
            (jeśli włączono)
          </span>
          <Input
            id="otp"
            name="otp"
            className="mt-2"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="6 cyfr"
          />
        </label>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? (
          <LoaderCircle size={17} className="animate-spin" />
        ) : (
          <ArrowRight size={17} />
        )}{" "}
        {busy ? "Proszę czekać…" : register ? "Utwórz gabinet" : "Zaloguj się"}
      </Button>
    </form>
  );
}
