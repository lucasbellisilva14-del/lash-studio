"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (PWA instalável) — só em produção.
 * Em dev, desregistra qualquer SW antigo para nunca servir estáticos velhos.
 */
export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // sem HTTPS/suporte — segue sem PWA
      });
    } else {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      });
    }
  }, []);
  return null;
}
