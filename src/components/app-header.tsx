"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signout } from "@/server/actions/auth";
import { PushToggle } from "@/components/push-toggle";

export function AppHeader() {
  const [signingOut, setSigningOut] = useState(false);

  function openSearch() {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CheckCircle2 className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">InsTareas</span>
        </Link>

        <div className="flex items-center gap-1">
          <PushToggle />
          <Button variant="ghost" size="icon" onClick={openSearch} aria-label="Buscar (Ctrl+K)">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Cerrar sesión"
            disabled={signingOut}
            onClick={async () => {
              setSigningOut(true);
              await signout();
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
