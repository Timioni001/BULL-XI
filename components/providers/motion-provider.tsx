"use client";

import { MotionConfig } from "motion/react";

/** Respect the system's reduced-motion setting for every animation in the app. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
