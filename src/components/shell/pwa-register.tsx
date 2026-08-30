"use client";

import { useEffect } from "react";

/** Registra o service worker (PWA instalável). */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // dev sem HTTPS/support — segue sem PWA
      });
    }
  }, []);
  return null;
}
