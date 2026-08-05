"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, GraduationCap, Loader2, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ConnectionStatus = {
  calendar: { provider: string; connectedAt: string }[];
  canvas: {
    connected: boolean;
    username: string | null;
    usingSession: boolean;
    usingToken: boolean;
  };
};

export function ConnectionsView() {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [canvasUser, setCanvasUser] = useState("");
  const [canvasPass, setCanvasPass] = useState("");

  useEffect(() => {
    fetch("/api/connections")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setCanvasUser(data.canvas?.username ?? "");
      })
      .catch(() => setError("No se pudo cargar el estado de las conexiones"))
      .finally(() => setLoading(false));
  }, []);

  const googleConnected = status?.calendar?.some((c) => c.provider === "google") ?? false;

  async function onConnectCanvas() {
    setSaving(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/canvas-connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: canvasUser, password: canvasPass }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setMessage("Credenciales guardadas. El próximo sync abrirá tu sesión del Aula Virtual automáticamente.");
      setCanvasPass("");
      setStatus((s) => (s ? { ...s, canvas: { ...s.canvas, connected: true, username: canvasUser, usingToken: false } } : s));
    } else {
      setError(data.error ?? "No se pudo conectar");
    }
  }

  async function onDisconnectGoogle() {
    setSaving(true);
    const res = await fetch("/api/calendar-oauth/disconnect", { method: "DELETE" });
    setSaving(false);
    if (res.ok) {
      setStatus((s) => (s ? { ...s, calendar: [] } : s));
    } else {
      setError("No se pudo desconectar Google Calendar");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Aula Virtual */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">Aula Virtual (ESPOL)</p>
              <p className="text-sm text-muted-foreground">
                {status?.canvas.connected
                  ? status.canvas.usingSession
                    ? "Conectado por sesión (login automático)"
                    : status.canvas.usingToken
                      ? "Conectado con token de acceso"
                      : "Conectado"
                  : "No conectado"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full",
              status?.canvas.connected ? "bg-emerald-500" : "bg-muted"
            )}
          />
        </div>

        {!status?.canvas.connected && (
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              onConnectCanvas();
            }}
          >
            <input
              type="text"
              value={canvasUser}
              onChange={(e) => setCanvasUser(e.target.value)}
              placeholder="Usuario Espol (ej. xhcg2003)"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              required
            />
            <input
              type="password"
              value={canvasPass}
              onChange={(e) => setCanvasPass(e.target.value)}
              placeholder="Contraseña del Aula Virtual"
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              required
            />
            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Conectar Aula Virtual
            </Button>
            <p className="text-xs text-muted-foreground">
              Tus credenciales se cifran (AES-256-GCM). Solo se usan para abrir tu
              sesión del Aula Virtual automáticamente y nunca se muestran.
            </p>
          </form>
        )}
      </section>

      {/* Google Calendar */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarIcon className="h-4 w-4" />
            </span>
            <div>
              <p className="font-semibold">Google Calendar</p>
              <p className="text-sm text-muted-foreground">
                {googleConnected ? "Conectado — tus tareas se publican automáticamente" : "No conectado"}
              </p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex h-2.5 w-2.5 rounded-full",
              googleConnected ? "bg-emerald-500" : "bg-muted"
            )}
          />
        </div>

        <div className="mt-4">
          {googleConnected ? (
            <Button variant="outline" onClick={onDisconnectGoogle} disabled={saving} className="gap-1.5 text-destructive">
              <Unplug className="h-3.5 w-3.5" />
              Desconectar
            </Button>
          ) : (
            <a href="/api/calendar-oauth/start">
              <Button className="w-full gap-1.5">
                <CalendarIcon className="h-3.5 w-3.5" />
                Conectar Google Calendar
              </Button>
            </a>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Sin API keys: autorizas una vez con tu cuenta de Google y el worker
            crea, actualiza y borra eventos de tus tareas automáticamente.
          </p>
        </div>
      </section>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-emerald-600">{message}</p>}
    </div>
  );
}