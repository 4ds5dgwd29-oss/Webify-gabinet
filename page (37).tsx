import Link from "next/link";
import { ArrowRight, Check, ShieldCheck, Sprout, Users } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-7">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="outline">
            <Link href="/logowanie">Zaloguj się</Link>
          </Button>
        </div>
      </header>
      <main
        id="tresc"
        className="mx-auto grid max-w-7xl gap-12 px-6 py-14 lg:grid-cols-2 lg:items-center lg:py-24"
      >
        <section>
          <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-widest">
            <Sprout size={14} /> Twój gabinet. Twoja przestrzeń.
          </span>
          <h1 className="display mt-8 max-w-xl text-5xl leading-[1.08] sm:text-7xl">
            Więcej przestrzeni
            <br />
            na <span className="italic text-primary">dobrą pracę.</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground">
            Zacznij od własnego, uporządkowanego miejsca dla swojego gabinetu i
            zespołu.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild className="h-12">
              <Link href="/rejestracja">
                Utwórz gabinet <ArrowRight size={17} />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-12">
              <Link href="/logowanie">Mam już konto</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            30 dni okresu próbnego · Bez podawania karty
          </p>
        </section>
        <section
          aria-label="Zakres pierwszej wersji"
          className="relative rounded-[2rem] border bg-muted p-6 sm:p-10"
        >
          <div className="mb-8 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Pierwszy krok do spokojniejszego dnia
            </span>
            <Sprout className="text-primary" size={28} />
          </div>
          <div className="rounded-2xl border bg-card p-7 shadow-sm">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-primary">
              <ShieldCheck size={25} />
            </div>
            <h2 className="display text-3xl">Dobre podstawy.</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Osobna przestrzeń gabinetu, jasno określone uprawnienia i kontrola
              dostępu.
            </p>
            <ul className="mt-7 space-y-4 text-sm">
              {[
                "Konto właściciela gabinetu",
                "Role właściciela i recepcji",
                "Opcjonalne logowanie dwuetapowe",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Check size={18} className="shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            <Users size={19} className="mt-0.5 shrink-0" />
            <p>
              Pacjenci, kalendarz, dokumentacja i rozliczenia.
              <br />
              Spokojna przestrzeń do codziennej pracy.
            </p>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 border-t px-6 py-7 text-xs text-muted-foreground">
        <span>Webify Gabinet</span>
        <span>Stworzone z myślą o praktyce psychologicznej</span>
      </footer>
    </div>
  );
}
