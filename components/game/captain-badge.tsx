import { cn } from "@/lib/utils";

/** Gold armband. "C" for captain, "V" for vice. Gold is reserved for this. */
export function CaptainBadge({ role, size = 18, className }: { role: "C" | "V"; size?: number; className?: string }) {
  return (
    <span
      aria-label={role === "C" ? "Captain" : "Vice-captain"}
      className={cn(
        "grid place-items-center rounded-full font-bold leading-none",
        role === "C" ? "bg-gold text-black shadow-[0_0_0_2px_var(--pitch),0_0_12px_rgb(245_196_81/0.45)]" : "bg-black text-gold ring-[1.5px] ring-inset ring-gold shadow-[0_0_0_2px_var(--pitch)]",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      {role}
    </span>
  );
}
