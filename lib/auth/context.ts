"use client";

import { createContext, useContext } from "react";

/**
 * Sign-in state for the UI. Screens only use `useAuth()`; the provider behind
 * it (Privy today) can change without touching them. Players sign in before
 * using the app (see components/layout/sign-in-gate.tsx).
 */
export type AuthStatus =
  /** No sign-in configured (no Privy App ID) */
  | "unavailable"
  | "loading"
  /** Sign-in is configured but did not load (blocked network, domain not allowed) */
  | "failed"
  | "guest"
  | "signedIn";

export type SignInMethod = "google" | "email" | "wallet";

export interface Account {
  id: string;
  name: string | null;
  email: string | null;
  method: SignInMethod;
  /** Solana address of the account (created automatically for Google and email) */
  address: string | null;
}

export interface Auth {
  status: AuthStatus;
  account: Account | null;
  /** Google or email. No crypto words in this flow. */
  signIn: () => void;
  /** Wallet sign-in, offered only on Go Pro */
  connectWallet: () => void;
  signOut: () => Promise<void>;
  /** Signs a serialized transaction as the player (no pop-up for Google and email accounts). */
  signTransaction?: (tx: Uint8Array) => Promise<Uint8Array>;
  /** Signs raw bytes as the player (used to read the private squad back). */
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

const noop = () => {};
export const unavailableAuth: Auth = { status: "unavailable", account: null, signIn: noop, connectWallet: noop, signOut: async () => {} };

export const failedAuth: Auth = { ...unavailableAuth, status: "failed" };

export const AuthContext = createContext<Auth>(unavailableAuth);

export const useAuth = () => useContext(AuthContext);
