import Link from "next/link";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import { ShieldCheck } from "lucide-react";
export function AuthShell({
  register = false,
  children,
}: {
  register?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <Brand />
        <ThemeToggle />
      </header>
      <main
        id="tresc"
        className="mx-auto grid max-w-5xl gap-16 px-6 py-8 lg:grid-cols-2 lg:items-center lg:py-14"
      >
        <aside className="hidden lg:block">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Webify Gabinet
          </p>
          <h1 className="display text-6xl leading-[1.1]">
            Spokojne miejsce
            <br />
            dla Twojej
            <br />
            <span className="italic text-primary">praktyki.</span>
          </h1>
          <p className="mt-7 max-w-sm leading-relaxed text-muted-foreground">
            Porządek zaczyna się od dobrych podstaw. Wszystko, czego
            potrzebujesz, krok po kroku.
          </p>
          <div className="mt-10 flex max-w-sm gap-3 border-t pt-6 text-sm text-muted-foreground">
            <ShieldCheck className="shrink-0 text-primary" size={21} />
            <p>
              Dostęp do gabinetu tylko dla uprawnionych osób z Twojego zespołu.
            </p>
          </div>
        </aside>
        <section className="rounded-2xl border bg-card p-7 shadow-sm sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            {register ? "Zacznij tutaj" : "Dobrze Cię widzieć"}
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            {register ? "Twój nowy gabinet" : "Zaloguj się do gabinetu"}
          </h2>
          <p className="mb-7 mt-2 text-sm leading-relaxed text-muted-foreground">
            {register
              ? "Utwórz konto właściciela. Okres próbny trwa 30 dni."
              : "Wpisz dane swojego konta, aby kontynuować."}
          </p>
          {children}
          <p className="mt-7 border-t pt-6 text-center text-sm text-muted-foreground">
            {register ? "Masz już konto?" : "Nie masz jeszcze konta?"}{" "}
            <Link
              className="font-semibold text-primary underline-offset-4 hover:underline"
              href={register ? "/logowanie" : "/rejestracja"}
            >
              {register ? "Zaloguj się" : "Utwórz gabinet"}
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
