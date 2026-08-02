"use client";

import { useState } from "react";
import { CalendarDays, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CalendarSubscribeButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);

  const webcalUrl = () => `webcal://${window.location.host}/api/calendar/${userId}/ics`;

  async function copyUrl() {
    const url = webcalUrl();
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

  function onSubscribe() {
    // En Android/iOS/Windows e iOS abre la app de calendario registrada
    // (Google Calendar, Calendario de Apple, Outlook) con el diálogo de
    // suscripción al feed; el icono de copiar queda como respaldo.
    window.location.href = webcalUrl();
  }

  return (
    <div className="flex items-center gap-1.5">
      <Button variant="secondary" size="sm" onClick={onSubscribe} className="gap-1.5">
        <CalendarDays className="h-3.5 w-3.5" />
        Suscribir calendario
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Copiar URL de suscripción"
        className="h-8 w-8"
        onClick={copyUrl}
      >
        {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}