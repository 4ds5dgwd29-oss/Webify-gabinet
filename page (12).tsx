import { ShieldCheck } from "lucide-react";
import { currentContext } from "@/server/auth/context";
import { accountSummary } from "@/server/dal/account";
import { TotpForm } from "@/components/totp-form";
import { Card } from "@/components/ui/card";
export const metadata = { title: "Bezpieczeństwo konta" };
export default async function AccountPage() {
  const { session } = await currentContext();
  const account = await accountSummary(session.id);
  return (
    <>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Twoje konto
      </p>
      <h1 className="display mt-3 text-4xl">Bezpieczeństwo</h1>
      <p className="mt-3 text-sm text-muted-foreground">{account.email}</p>
      <Card className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-primary" />
            <h2 className="text-lg font-semibold">
              Uwierzytelnianie dwuetapowe
            </h2>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
            {account.totpEnabled ? "Włączone" : "Niewłączone"}
          </span>
        </div>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Połącz konto z aplikacją uwierzytelniającą. Przy logowaniu, oprócz
          hasła, poprosimy o jednorazowy kod.
        </p>
        <TotpForm enabled={account.totpEnabled} />
      </Card>
      <Card className="mt-6">
        <h2 className="font-semibold">Automatyczne zakończenie sesji</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Po 15 minutach bezczynności poprosimy o ponowne logowanie. Sesja
          wygasa również po 8 godzinach od zalogowania.
        </p>
      </Card>
    </>
  );
}
