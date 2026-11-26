import { Easing } from "remotion";

export const C = {
  cream: "#EEEAE1",
  creamInk: "#1F1E1C",
  light: "#F4F4F2",
  lightInk: "#0E0E0E",
  dark: "#0B0B0B",
  darkInk: "#F5F5F3",
  muted: "#8A8A86",
  bull: "#16C784",
  bear: "#EA3943",
  gold: "#F5C451",
  brand: "#FF5B1F",
};

export const F = {
  serif: "'Instrument Serif', Georgia, serif",
  sans: "Inter, Helvetica, Arial, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
};

export const ease = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
