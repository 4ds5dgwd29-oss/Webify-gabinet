"use client";
import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "./ui/button";
export function SessionControls() {
  const lastActivity = useRef(Date.now()),
    lastPing = useRef(0);
  useEffect(() => {
    let stopped = false;
    const logout = () => {
      if (!stopped) {
        stopped = true;
        void signOut({ callbackUrl: "/logowanie" });
      }
    };
    const activity = () => {
      if (Date.now() - lastActivity.current > 15 * 60_000) {
        logout();
        return;
      }
      lastActivity.current = Date.now();
      if (Date.now() - lastPing.current < 60_000) return;
      lastPing.current = Date.now();
      void fetch("/api/sesja/aktywnosc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
        .then((r) => {
          if (r.status === 401) logout();
        })
        .catch(() => {});
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((e) =>
      window.addEventListener(e, activity, { passive: true }),
    );
    const interval = setInterval(() => {
      if (Date.now() - lastActivity.current >= 15 * 60_000) logout();
    }, 15_000);
    return () => {
      stopped = true;
      clearInterval(interval);
      events.forEach((e) => window.removeEventListener(e, activity));
    };
  }, []);
  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-muted-foreground"
      onClick={() => signOut({ callbackUrl: "/logowanie" })}
    >
      <LogOut size={17} />
      Wyloguj się
    </Button>
  );
}
