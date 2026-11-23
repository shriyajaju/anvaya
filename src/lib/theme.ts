"use client";

import { useSyncExternalStore } from "react";

function subscribeTheme(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}

function themeDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

export function useDarkTheme() {
  const dark = useSyncExternalStore(subscribeTheme, themeDark, () => false);

  function setDark(next: boolean) {
    const theme = next ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("anvaya-theme", theme);
  }

  return [dark, setDark] as const;
}
