"use client";

import { useSyncExternalStore } from "react";

/** App appearance. Stored per device; applied as a class on <html>. */
export type Theme = "light" | "dark";

import { THEME_KEY } from "./theme-boot";
export { THEME_KEY };
const COLORS: Record<Theme, string> = { light: "#F4F4F2", dark: "#161618" };
const listeners = new Set<() => void>();

function read(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("theme-dark") ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("theme-dark", theme === "dark");
  root.style.colorScheme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", COLORS[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* storage blocked: theme lasts for this visit */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "light",
  );
}

