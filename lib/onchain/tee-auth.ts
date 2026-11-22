/**
 * MagicBlock Private ER (TEE) login: GET a challenge, sign it, exchange it for
 * a bearer token. The token goes in the RPC URL as `?token=`. Sending
 * transactions to the TEE requires it; reading private accounts requires a
 * token from one of the account's members. Runtime-agnostic (Web Crypto).
 */
import { getBase58Decoder, type Address } from "@solana/kit";

export interface TeeToken {
  token: string;
  /** ms epoch when we should fetch a new one */
  expiresAt: number;
}

/** Signs raw bytes with the account's key (Privy wallet, KeyPairSigner, ...). */
export type SignBytes = (message: Uint8Array) => Promise<Uint8Array>;

export async function teeLogin(teeUrl: string, pubkey: Address, sign: SignBytes): Promise<TeeToken> {
  const base = teeUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/auth/challenge?pubkey=${pubkey}`);
  if (!res.ok) throw new Error(`TEE challenge ${res.status}`);
  const { challenge } = (await res.json()) as { challenge: string };
  const signature = getBase58Decoder().decode(await sign(new TextEncoder().encode(challenge)));
  const login = await fetch(`${base}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pubkey, challenge, signature }),
  });
  if (!login.ok) throw new Error(`TEE login ${login.status}: ${(await login.text()).slice(0, 200)}`);
  const body = (await login.json()) as { token: string; expiresAt?: number };
  return { token: body.token, expiresAt: body.expiresAt ? body.expiresAt * (body.expiresAt < 1e12 ? 1000 : 1) - 60_000 : Date.now() + 50 * 60_000 };
}

export const teeRpcUrl = (teeUrl: string, token: string) => `${teeUrl.replace(/\/$/, "")}?token=${encodeURIComponent(token)}`;
