"use client";

import { useState, useSyncExternalStore } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { triggerSync } from "./sync-actions";

export function SyncButton({ lastRunAt, lastSuccess }: {
  lastRunAt?: string | null;
  lastSuccess?: boolean;
}) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  async function onSync() {
    setSyncing(true);
    setMessage(null);
    const res = await triggerSync();
    setSyncing(false);
    if (res?.ok) {
      setMessage("Sincronización programada. Toma ~1 min en GitHub Actions.");
    } else if (res?.error) {
      setMessage(res.error);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {lastRunAt ? (
            <>
              Última sincronización:{" "}
              <span className={cn("font-medium", lastSuccess ? "text-foreground" : "text-destructive")}>
                {mounted && formatDistanceToNowStrict(new Date(lastRunAt), { locale: es, addSuffix: true })}
              </span>
            </>
          ) : (
            "Sin sincronizar todavía"
          )}
        </p>
        <Button variant="secondary" size="sm" onClick={onSync} disabled={syncing} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", syncing && "animate-spin")} />
          {syncing ? "Programando…" : "Sincronizar"}
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
