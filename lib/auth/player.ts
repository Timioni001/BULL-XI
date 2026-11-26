"use client";

/**
 * Who signs onchain game actions.
 *  - Signed in (Privy): the account's key, same on every device.
 *  - Device: a key kept in this browser, used only if sign-in is unavailable
 *    or the account can't sign (a fallback so a locked squad is still sealed).
 * Players never pay fees: the game Worker sponsors allowlisted actions.
 */
import { useMemo } from "react";
import { createKeyPairSignerFromPrivateKeyBytes, getTransactionDecoder, getTransactionEncoder, signBytes, type KeyPairSigner, type SignatureBytes } from "@solana/kit";
import type { PlayerSigner } from "@/lib/data/types";
import { useAuth } from "./context";

const KEY = "bullxi:device-key";
let cached: Promise<KeyPairSigner> | null = null;

function loadSeed(): Uint8Array {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) {
      const bytes = Uint8Array.from(atob(saved), (c) => c.charCodeAt(0));
      if (bytes.length === 32) return bytes;
    }
  } catch {
    /* storage blocked: a fresh key per session */
  }
  const seed = crypto.getRandomValues(new Uint8Array(32));
  try {
    localStorage.setItem(KEY, btoa(String.fromCharCode(...seed)));
  } catch {
    /* ignore */
  }
  return seed;
}

export function deviceSigner(): Promise<KeyPairSigner> {
  cached ??= createKeyPairSignerFromPrivateKeyBytes(loadSeed());
  return cached;
}

/** The device account's address, if this browser already has one (no key is created). */
export function existingDeviceAddress(): Promise<string | null> {
  try {
    if (!localStorage.getItem(KEY)) return Promise.resolve(null);
  } catch {
    return Promise.resolve(null);
  }
  return deviceSigner().then((s) => s.address);
}

export async function devicePlayer(): Promise<PlayerSigner> {
  const s = await deviceSigner();
  return {
    address: s.address,
    signMessage: (m) => signBytes(s.keyPair.privateKey, m),
    signTransaction: async (wire) => {
      const tx = getTransactionDecoder().decode(wire);
      const sig = (await signBytes(s.keyPair.privateKey, tx.messageBytes)) as SignatureBytes;
      return new Uint8Array(getTransactionEncoder().encode({ ...tx, signatures: { ...tx.signatures, [s.address]: sig } }));
    },
  };
}

export type PlayerKind = "account" | "device";

/** Resolves the onchain player: the signed-in account if available, else this device. */
export function useOnchainPlayer(): { kind: PlayerKind; ready: boolean; get: () => Promise<PlayerSigner> } {
  const auth = useAuth();
  return useMemo(() => {
    const addr = auth.account?.address;
    if (auth.status === "signedIn" && addr && auth.signTransaction && auth.signMessage) {
      const p: PlayerSigner = { address: addr, signTransaction: auth.signTransaction, signMessage: auth.signMessage };
      return { kind: "account" as const, ready: true, get: async () => p };
    }
    // Signed in but the account's key is still being set up, or sign-in is loading: wait
    // rather than create a device key a signed-in player doesn't need.
    const waiting = auth.status === "loading" || auth.status === "signedIn";
    return { kind: "device" as const, ready: !waiting, get: devicePlayer };
  }, [auth]);
}
