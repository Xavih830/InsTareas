"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 120_000 }: { intervalMs?: number }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, pathname, intervalMs]);

  return null;
}