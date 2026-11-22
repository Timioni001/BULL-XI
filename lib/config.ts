/**
 * The one place the network lives. Switching to mainnet is a one-line change
 * to NETWORK (and only if MagicBlock sponsors it).
 */
export type Network = "devnet" | "mainnet";

export const NETWORK: Network = "devnet";

interface NetworkConfig {
  label: string;
  /** Solana base layer RPC (free public endpoint) */
  solanaRpc: string;
  /** MagicBlock Ephemeral Rollup RPC */
  erRpc: string;
  erWs: string;
  /** MagicBlock Magic Router */
  router: string;
  /** MagicBlock Private ER (TEE) */
  teeRpc: string;
  /** ER validator identity used when delegating */
  erValidator: string;
  teeValidator: string;
  /** Explorer cluster query, e.g. "?cluster=devnet" */
  explorerCluster: string;
  /** Shown wherever test tokens are used */
  previewNotice: string | null;
}

const CONFIGS: Record<Network, NetworkConfig> = {
  devnet: {
    label: "Devnet",
    solanaRpc: "https://api.devnet.solana.com",
    erRpc: "https://devnet-as.magicblock.app",
    erWs: "wss://devnet-as.magicblock.app",
    router: "https://devnet-router.magicblock.app",
    teeRpc: "https://devnet-tee.magicblock.app",
    erValidator: "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
    teeValidator: "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo",
    explorerCluster: "?cluster=devnet",
    previewNotice: "Devnet preview with test tokens priced from real market data.",
  },
  mainnet: {
    label: "Mainnet",
    solanaRpc: "https://api.mainnet-beta.solana.com",
    erRpc: "https://as.magicblock.app",
    erWs: "wss://as.magicblock.app",
    router: "https://router.magicblock.app",
    teeRpc: "https://mainnet-tee.magicblock.app",
    erValidator: "MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57",
    teeValidator: "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo",
    explorerCluster: "",
    previewNotice: null,
  },
};

export const config = CONFIGS[NETWORK];

/**
 * Privy App ID for sign-in (Google, email, Solana wallets). It is public, not
 * a secret. Set NEXT_PUBLIC_PRIVY_APP_ID at build time or paste it here.
 * Empty = sign-in hidden, play as guest.
 */
export const PRIVY_APP_ID: string = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";

/** Free mainnet price source (real xStock prices). Read-only, no key. */
export const PRICE_SOURCE = {
  name: "Jupiter Price API",
  url: "https://lite-api.jup.ag/price/v3",
  /**
   * Browser polling interval. The free API rate-limits a full 41-stock batch
   * at 1/s (measured), and the xStocks reference price itself updates about
   * once a minute, so 3s loses nothing. Backs off on rate limits.
   */
  pollMs: 3000,
  /** Slowest poll after repeated rate limits */
  maxPollMs: 15_000,
} as const;

/** Explorer link for an address or transaction on the configured network. */
export function explorer(kind: "address" | "tx", id: string, opts?: { er?: boolean }): string {
  const base = `https://explorer.solana.com/${kind}/${id}`;
  if (opts?.er) return `${base}?cluster=custom&customUrl=${encodeURIComponent(config.erRpc)}`;
  return `${base}${config.explorerCluster}`;
}
