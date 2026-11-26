"use client";

import { toast } from "sonner";
import { copy } from "@/lib/copy";
import { routes } from "@/lib/routes";

/** Share a league invite link, falling back to copying it. */
export function useInvite() {
  return async (name: string, code: string, path = routes.join(code)) => {
    const url = `${window.location.origin}${path}`;
    const text = copy.leagues.inviteText(name, code);
    try {
      if (navigator.share) {
        await navigator.share({ title: name, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text} ${url}`);
      toast(copy.common.linkCopied, { description: url });
    } catch {
      /* dismissed */
    }
  };
}
