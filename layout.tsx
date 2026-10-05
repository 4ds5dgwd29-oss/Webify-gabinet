import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Building2,
  Sprout,
} from "lucide-react";
import { currentContext } from "@/server/auth/context";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { SessionControls } from "@/components/session-controls";
import { QuickSearch } from "@/components/quick-search";
async function context() {
  try {
    return await currentContext();
  } catch {
    redirect("/logowanie");
  }
}
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, principal } = await context();
  const platform = principal.role === "SUPER_ADMIN";
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col border-b bg-card px-5 py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r lg:py-8">
        <Brand />
        <div className="mt-7 rounded-xl bg-muted px-3 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            {platform ? "Administracja Webify" : "Przestrzeń gabinetu"}
          </p>
          <p className="mt-1 truncate text-sm font-medium">
            {platform ? "Panel platformy" : user.tenant.name}
          </p>
        </div>
        <nav
          aria-label="Menu główne"
          className="mt-5 flex flex-wrap gap-1 text-sm lg:flex-col lg:overflow-y-auto"
        >
          {(platform
            ? [["/platforma", "Gabinety"]]
            : [
                ["/gabinet", "Mój gabinet"],
                ["/gabinet/pacjenci", "Pacjenci"],
                ["/gabinet/kalendarz", "Kalendarz"],
                ["/gabinet/rozliczenia", "Rozliczenia"],
                ...(principal.role === "OWNER"
                  ? [
                      ["/gabinet/cennik", "Cennik"],
                      ["/gabinet/przypomnienia", "Przypomnienia"],
                      ["/gabinet/zespol", "Zespół"],
                      ["/gabinet/subskrypcja", "Subskrypcja"],
                      ["/gabinet/ustawienia", "Ustawienia gabinetu"],
                      ["/gabinet/ochrona-danych", "Ochrona danych"],
                    ]
                  : []),
                ["/gabinet/opinie", "Opinie i pomoc"],
              ]
          )
            .concat([["/konto", "Bezpieczeństwo"]])
            .map(([href, label]) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-2 hover:bg-muted focus-visible:outline-primary"
              >
                {label}
              </Link>
            ))}
        </nav>
        <div className="hidden flex-1 lg:block" />
        <div className="mt-5 border-t pt-3">
          <SessionControls />
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex h-20 items-center justify-between gap-3 border-b bg-card/70 px-5 md:px-10">
          <QuickSearch platform={platform} />
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {principal.role === "OWNER"
                  ? "Właściciel gabinetu"
                  : platform
                    ? "Administrator platformy"
                    : "Recepcja / asystent"}
              </p>
            </div>
            <span
              aria-hidden="true"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-primary"
            >
              {user.name
                .split(" ")
                .map((s) => s[0])
                .slice(0, 2)
                .join("")}
            </span>
          </div>
        </header>
        <main
          id="tresc"
          className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10"
        >
          {principal.status === "READ_ONLY" && (
            <p
              role="status"
              className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
            >
              Gabinet jest w trybie tylko do odczytu. Dane pozostają dostępne.
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
