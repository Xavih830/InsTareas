"use client";

import { useSyncExternalStore, useState } from "react";
import { CalendarDays, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calendarFeedUrl, isLocalHost } from "@/lib/calendar-url";

function isAppleDevice() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
}

export function CalendarSubscribeButton({ userId }: { userId: string }) {
  const [copied, setCopied] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // SSR/prerender: `isLocalHost()` devuelve false en el servidor; durante la
  // hidratación el texto del botón depende de `window`, por lo que se espera
  // el montaje (useSyncExternalStore) antes de decidir el label.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const local = mounted && isLocalHost();

  function onSubscribe() {
    // En localhost los calendarios de terceros (Google, Windows) NO pueden
    // alcanzar el feed: no es una URL pública. Mejor avisar que lanzar un
    // diálogo que va a fallar con "verificar URL".
    if (local) {
      setHint(
        "La suscripción requiere que la app esté publicada en internet " +
          "(Vercel/dominio https). Estás en localhost: despliega la app y usa " +
          "este botón desde la URL pública, o pega la URL copiada en tu " +
          'calendario tras el deploy. El feed local "https://localhost" no ' +
          "es alcanzable por Google Calendar ni Calendario de Windows."
      );
      return;
    }

    // Apple Calendar (iOS/macOS Safari) registra el protocolo webcal:// de
    // forma nativa: se lanza directo y el sistema abre el diálogo de
    // suscripción. En el resto de plataformas (Windows, Android, escritorio)
    // `webcal://` no tiene handler: se abre como http, descarga el .ics o pide
    // elegir app/cuenta y se cierra sin guardar nada. Para esas, Google
    // Calendar acepta la suscripción por `cid` (URL con el feed prellenado).
    // Se abre en pestaña nueva para no perder la app.
    if (isAppleDevice()) {
      window.location.href = calendarFeedUrl(userId).replace(/^https/, "webcal");
      return;
    }
    const cid = encodeURIComponent(calendarFeedUrl(userId));
    window.open(`https://calendar.google.com/calendar/r?cid=${cid}`, "_blank", "noopener");
    setHint(
      "Se abrió Google Calendar en una pestaña nueva. Elige la cuenta, pulsa " +
        '"Añadir calendario" (abajo a la derecha del diálogo) y confirma. Las ' +
        "tareas aparecen en unos minutos, no al instante: Google sincroniza el " +
        "feed periódicamente."
    );
  }

  async function copyUrl() {
    // URL https (no webcal): es la que aceptan todos los clientes de
    // escritorio/móvil para suscribirse pegando la URL (Calendario de
    // Windows, Outlook, Thunderbird, Apple, Google).
    const url = calendarFeedUrl(userId);
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
    if (local) {
      setHint(
        `URL copiada (${url}). Es una URL local: solo servirá tras desplegar ` +
          "la app en internet. Al hacerlo, vuelve a copiarla desde la app " +
          "publicada."
      );
    } else {
      setHint(
        "URL copiada. Para suscribirla en Windows: abre la app Calendario → " +
          '"Agregar calendario" (o "Suscribirse") y pega la URL. En Outlook: ' +
          '"Agregar calendario" → "Desde Internet". En iPhone: Ajustes → ' +
          'Calendario → Cuentas → Agregar cuenta → "Otra" → "Suscripción ' +
          "de calendario\" y pega la URL."
      );
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" onClick={onSubscribe} className="gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" />
          {local
            ? "Suscribir calendario"
            : isAppleDevice()
              ? "Suscribir calendario"
              : "Suscribir en Google Calendar"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Copiar URL de suscripción"
          title="Copiar URL (Windows, Outlook, iPhone…)"
          className="h-8 w-8"
          onClick={copyUrl}
        >
          {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      {hint && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
          {hint}
        </p>
      )}
    </div>
  );
}