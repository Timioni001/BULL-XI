"use client";

import { Suspense, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster, toast } from "sonner";
import { useGame } from "@/lib/store/game";

/** Effects that depend on the URL. Kept in their own Suspense boundary so pages stay prerenderable. */
function RouteEffects() {
  const path = usePathname();
  const hydrated = useGame((s) => s.hydrated);

  // `?demo=1` turns demo mode on, `?demo=0` turns it off. It sticks until changed.
  useEffect(() => {
    if (!hydrated) return;
    const q = new URLSearchParams(window.location.search).get("demo");
    if (q === "1" || q === "on") useGame.getState().setDemoMode(true);
    if (q === "0" || q === "off") useGame.getState().setDemoMode(false);
  }, [hydrated, path]);

  // Toasts belong to the screen that raised them.
  useEffect(() => {
    toast.dismiss();
  }, [path]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const demoMode = useGame((s) => s.demoMode);

  useEffect(() => {
    void useGame.persist.rehydrate();
  }, []);

  // Loaded lazily so the landing page doesn't ship the data layer up front.
  useEffect(() => {
    void import("@/lib/data").then((m) => m.configureMarket({ fast: demoMode }));
  }, [demoMode]);

  return (
    <>
      <Suspense fallback={null}>
        <RouteEffects />
      </Suspense>
      {children}
      <Toaster
        position="bottom-center"
        theme="light"
        offset={132}
        mobileOffset={{ bottom: 132, left: 16, right: 16 }}
        toastOptions={{
          classNames: {
            toast: "!bg-white !border-hairline !text-foreground !rounded-2xl !shadow-[0_18px_40px_-16px_rgb(0_0_0/0.3)] !font-sans",
            description: "!text-muted-foreground",
            actionButton: "!bg-[#111] !text-white !rounded-full !font-semibold",
          },
        }}
      />
    </>
  );
}
