"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CalendarSubscribeButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    const url = `webcal://${window.location.host}/api/calendar/${userId}/ics`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      el.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="secondary" size="sm" onClick={onCopy} className="gap-1.5">
      <CalendarDays className="h-3.5 w-3.5" />
      {copied ? "¡URL copiada!" : "Suscribir calendario"}
    </Button>
  );
}