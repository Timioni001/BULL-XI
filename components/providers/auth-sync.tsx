"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth/context";
import { copy } from "@/lib/copy";
import { useGame } from "@/lib/store/game";

const DEFAULT_NAME = "Alex Morgan";

/** After sign-in: use the account's first name as manager name if it was never changed, and say hello once. */
export function AuthSync() {
  const { status, account } = useAuth();
  const hydrated = useGame((s) => s.hydrated);
  const greeted = useRef<string | null>(null);

  useEffect(() => {
    if (status !== "signedIn" || !account || !hydrated) return;
    const { managerName, setProfile } = useGame.getState();
    if (account.name && managerName === DEFAULT_NAME) setProfile({ managerName: account.name });
    if (greeted.current === null) {
      greeted.current = account.id;
      return; // already signed in on load: no toast
    }
    if (greeted.current !== account.id) {
      greeted.current = account.id;
      toast(copy.account.welcome(account.name?.split(" ")[0] ?? copy.account.signIn));
    }
  }, [status, account, hydrated]);

  useEffect(() => {
    if (status === "guest") greeted.current = "guest";
  }, [status]);

  return null;
}
