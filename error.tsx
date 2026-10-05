"use client";
import { Button } from "@/components/ui/button";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <section>
      <h1 className="display text-3xl">Nie można otworzyć tej strony</h1>
      <p className="my-5 text-muted-foreground">
        Sprawdź, czy masz odpowiednie uprawnienia i aktywną sesję.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Spróbuj ponownie</Button>
        <Button asChild variant="outline">
          <a href="/logowanie">Przejdź do logowania</a>
        </Button>
      </div>
    </section>
  );
}
