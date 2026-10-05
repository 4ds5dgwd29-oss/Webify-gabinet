import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main id="tresc" className="mx-auto max-w-xl px-6 py-24">
      <p className="text-sm text-muted-foreground">Błąd 404</p>
      <h1 className="display my-5 text-4xl">Nie znaleziono strony</h1>
      <Button asChild>
        <Link href="/gabinet">Przejdź do gabinetu</Link>
      </Button>
    </main>
  );
}
