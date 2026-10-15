"use client";

import { useEffect, useState } from "react";

export function PwaClient({ slug }: { slug: string }) {
  const [offline, setOffline] = useState(false);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [offer, setOffer] = useState(false);

  useEffect(() => {
    const onOffline = () => setOffline(!navigator.onLine);
    onOffline();
    window.addEventListener("online", onOffline);
    window.addEventListener("offline", onOffline);
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    const show = () => {
      if (window.localStorage.getItem("anvaya-ar-started") === "1") setOffer(true);
    };
    show();
    window.addEventListener("anvaya-ar-started", show);
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").then(() => {
        navigator.serviceWorker.controller?.postMessage({ type: "site", slug });
      });
    }
    return () => {
      window.removeEventListener("online", onOffline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("anvaya-ar-started", show);
    };
  }, [slug]);

  return (
    <>
      {offline ? (
        <p className="fixed inset-x-0 top-0 z-50 bg-conf-low px-4 py-2 text-center text-[13px] text-white">
          You are offline. The last opened site is still available.
        </p>
      ) : null}
      {offer && prompt ? (
        <button
          type="button"
          className="fixed bottom-4 left-4 right-4 z-50 h-12 rounded-card bg-white text-[11px] font-medium uppercase tracking-[0.08em] text-black"
          onClick={() => {
            void prompt.prompt();
            setOffer(false);
          }}
        >
          Install ANVAYA
        </button>
      ) : null}
    </>
  );
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void> };
