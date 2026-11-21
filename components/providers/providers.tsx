"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster, toast } from "sonner";
import { MotionConfig } from "framer-motion";
import { useGame } from "@/lib/store/game";

export function Providers({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  useEffect(() => {
    void useGame.persist.rehydrate();
  }, []);
  // Toasts belong to the screen that raised them.
  useEffect(() => {
    toast.dismiss();
  }, [path]);

  return (
    <MotionConfig reducedMotion="user">
      {children}
      <Toaster
        position="bottom-center"
        theme="dark"
        offset={132}
        mobileOffset={{ bottom: 132, left: 16, right: 16 }}
        toastOptions={{
          classNames: {
            toast: "!bg-surface-2 !border-hairline !text-foreground !rounded-2xl !shadow-2xl !font-sans",
            description: "!text-muted-foreground",
            actionButton: "!bg-foreground !text-background !rounded-lg !font-semibold",
          },
        }}
      />
    </MotionConfig>
  );
}
