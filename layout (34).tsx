import type { Metadata } from "next";
import { headers } from "next/headers";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Webify Gabinet — przestrzeń na dobrą pracę",
    template: "%s | Webify Gabinet",
  },
  description: "Spokojna przestrzeń do zarządzania praktyką psychologiczną.",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html lang="pl" suppressHydrationWarning>
      <body>
        <a
          className="fixed left-4 top-4 z-50 -translate-y-24 rounded-lg bg-primary px-4 py-3 text-primary-foreground focus:translate-y-0"
          href="#tresc"
        >
          Przejdź do treści
        </a>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
