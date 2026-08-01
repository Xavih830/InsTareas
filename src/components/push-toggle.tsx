"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { subscribeUser, unsubscribeUser } from "@/server/actions/push";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    navigator.serviceWorker
      .ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setEnabled(!!sub);
        setSupported(true);
      })
      .catch(() => {});
  }, []);

  async function toggle() {
    if (!supported) return;
    setWorking(true);
    try {
      if (enabled) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        await sub?.unsubscribe();
        if (sub) await unsubscribeUser(sub.endpoint);
        setEnabled(false);
      } else {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) {
          alert("Notificaciones no configuradas (falta NEXT_PUBLIC_VAPID_PUBLIC_KEY)");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
        await subscribeUser(JSON.parse(JSON.stringify(sub)));
        setEnabled(true);
      }
    } finally {
      setWorking(false);
    }
  }

  if (!supported) return null;

  return (
    <Button
      variant="secondary"
      size="icon"
      aria-label={enabled ? "Desactivar notificaciones" : "Activar notificaciones"}
      disabled={working}
      onClick={toggle}
    >
      {enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
    </Button>
  );
}
