import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Logowanie" };
export default function LoginPage() {
  return (
    <AuthShell>
      <AuthForm />
      <a
        href="/nowe-haslo"
        className="mt-5 block text-sm text-primary underline"
      >
        Nie pamiętasz hasła?
      </a>
    </AuthShell>
  );
}
