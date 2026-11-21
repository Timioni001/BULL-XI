"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Gold armband. "C" for captain, "V" for vice. Gold means captain and winners only.
 * Change `shineKey` to play a light sweep when the armband is assigned.
 */
export function CaptainBadge({ role, size = 18, className, shineKey }: { role: "C" | "V"; size?: number; className?: string; shineKey?: string | number }) {
  return (
    <span
      aria-label={role === "C" ? "Captain" : "Vice-captain"}
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-full font-display font-bold leading-none",
        role === "C"
          ? "bg-[linear-gradient(135deg,#ffe08a,#f5c451_45%,#d9a530)] text-black shadow-[0_0_0_2px_var(--pitch),0_0_14px_rgb(245_196_81/0.5)]"
          : "bg-black text-gold ring-[1.5px] ring-inset ring-gold shadow-[0_0_0_2px_var(--pitch)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      <span className="relative z-10">{role}</span>
      {shineKey !== undefined && (
        <motion.span
          key={shineKey}
          aria-hidden
          className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/90 to-transparent"
          initial={{ x: "-150%" }}
          animate={{ x: "250%" }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.1 }}
        />
      )}
    </span>
  );
}
