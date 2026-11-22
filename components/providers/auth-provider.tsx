"use client";

import { Component, useEffect, useState, type ComponentType, type ReactNode } from "react";
import { PRIVY_APP_ID } from "@/lib/config";
import { AuthContext, unavailableAuth } from "@/lib/auth/context";

type Provider = ComponentType<{ children: ReactNode }>;
const loading = { ...unavailableAuth, status: "loading" as const };

/** If the sign-in SDK fails (bad App ID, blocked network), keep the game playable as a guest. */
class SignInBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Sign-in unavailable:", error instanceof Error ? error.message : error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Loads the sign-in SDK after first paint so it never slows the app down.
 * Without a Privy App ID, sign-in is simply hidden.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [Impl, setImpl] = useState<Provider | null>(null);
  useEffect(() => {
    if (!PRIVY_APP_ID) return;
    let live = true;
    void import("@/lib/auth/privy").then((m) => live && setImpl(() => m.default));
    return () => {
      live = false;
    };
  }, []);
  if (Impl)
    return (
      <SignInBoundary fallback={<AuthContext.Provider value={unavailableAuth}>{children}</AuthContext.Provider>}>
        <Impl>{children}</Impl>
      </SignInBoundary>
    );
  return <AuthContext.Provider value={PRIVY_APP_ID ? loading : unavailableAuth}>{children}</AuthContext.Provider>;
}
