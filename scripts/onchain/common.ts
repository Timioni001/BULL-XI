import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/kit";

/** Devnet-only keys live outside the repo. Override with BULLXI_KEYS_DIR. */
export const KEYS_DIR = process.env.BULLXI_KEYS_DIR ?? `${homedir()}/.config/solana/bullxi`;

export async function loadSigner(name: "deployer" | "pusher"): Promise<KeyPairSigner> {
  const bytes = new Uint8Array(JSON.parse(readFileSync(`${KEYS_DIR}/${name}.json`, "utf8")) as number[]);
  return createKeyPairSignerFromBytes(bytes);
}
