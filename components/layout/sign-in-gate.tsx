"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { ArrowRight, Check, RotateCw } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";
import { dur, ease } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Logo, Wordmark } from "@/components/brand/logo";

const t = copy.account.gate;
/** Public pages inside /app that anyone can open (shared manager profiles). */
const PUBLIC = ["/app/manager"];
const GUEST_KEY = "bullxi:guest-ok";

function guestAllowed() {
  try {
    return sessionStorage.getItem(GUEST_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Players sign in before using the app. Public profiles stay open. If sign-in
 * is not configured (local builds) the app opens directly; if it fails to load,
 * the player can retry or, as a last resort, play on this device.
 */
export function SignInGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const path = usePathname() ?? "";
  const [guest, setGuest] = useState(guestAllowed);

  if (PUBLIC.some((p) => path.startsWith(p))) return <>{children}</>;
  if (auth.status === "signedIn" || auth.status === "unavailable") return <>{children}</>;
  if (auth.status === "failed" && guest) return <>{children}</>;

  if (auth.status === "loading") {
    return (
      <div className="grid min-h-dvh flex-1 place-items-center" aria-busy="true">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: dur.slow, ease }}>
          <Logo size={56} />
        </motion.div>
      </div>
    );
  }

  const failed = auth.status === "failed";
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="pt-safe flex h-16 items-center justify-between px-5">
        <Link href={routes.landing} className="flex items-center gap-2.5" aria-label={t.home}>
          <Logo size={30} decorative />
          <Wordmark />
        </Link>
        <Link href={routes.proof} className="h-10 px-2 text-[13px] font-medium leading-10 text-muted-foreground hover:text-foreground">
          {t.proof}
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-4">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: dur.slow, ease }}
          className="w-full max-w-[420px] rounded-[28px] border border-hairline bg-surface-1 p-6 shadow-sm sm:p-8"
        >
          <Logo size={48} className="mb-6" />
          <p className="text-label font-semibold uppercase text-muted-foreground">{t.eyebrow}</p>
          <h1 className="mt-2 font-display text-[34px] font-bold uppercase leading-[0.95] tracking-tight sm:text-[40px]">{failed ? t.failedTitle : t.title}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{failed ? t.failedBody : t.body}</p>

          {!failed && (
            <ul className="mt-5 space-y-2.5">
              {t.points.map((p) => (
                <li key={p} className="flex items-center gap-2.5 text-[14px]">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-3">
                    <Check className="size-3" aria-hidden />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-7 space-y-3">
            {failed ? (
              <>
                <Button size="cta" className="w-full" onClick={() => window.location.reload()}>
                  <RotateCw /> {t.retry}
                </Button>
                <button
                  className="h-11 w-full text-[14px] font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    try {
                      sessionStorage.setItem(GUEST_KEY, "1");
                    } catch {
                      /* ignore */
                    }
                    setGuest(true);
                  }}
                >
                  {t.guest}
                </button>
              </>
            ) : (
              <Button size="cta" className="w-full" onClick={auth.signIn}>
                {t.cta} <ArrowRight />
              </Button>
            )}
            <Link href={routes.landing} className="block h-11 text-center text-[14px] font-medium leading-[44px] text-muted-foreground hover:text-foreground">
              {t.home}
            </Link>
          </div>
        </motion.section>
      </main>
    </div>
  );
}
