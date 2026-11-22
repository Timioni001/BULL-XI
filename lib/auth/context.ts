"use client";

import { createContext, useContext } from "react";

/**
 * Sign-in state for the UI. Screens only use `useAuth()`; the provider behind
 * it (Privy today) can change without touching them. Playing never needs an
 * account: signing in saves your team and leagues to an account.
 */
export type AuthStatus =
  /** No sign-in configured (no Privy App ID) */
  | "unavailable"
  | "loading"
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
}

const noop = () => {};
export const unavailableAuth: Auth = { status: "unavailable", account: null, signIn: noop, connectWallet: noop, signOut: async () => {} };

export const AuthContext = createContext<Auth>(unavailableAuth);

export const useAuth = () => useContext(AuthContext);
