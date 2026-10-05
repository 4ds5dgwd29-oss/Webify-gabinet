import Link from "next/link";
import { Waves } from "lucide-react";
export function Brand() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-3"
      aria-label="Webify Gabinet — strona główna"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <Waves aria-hidden="true" size={24} />
      </span>
      <span className="text-xl font-semibold tracking-tight">
        webify
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          gabinet
        </span>
      </span>
    </Link>
  );
}
