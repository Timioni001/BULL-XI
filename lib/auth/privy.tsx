"use client";

import { useMemo } from "react";
import { PrivyProvider, useLogin, useLogout, usePrivy, type User } from "@privy-io/react-auth";
import { toSolanaWalletConnectors, useWallets } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import { config, PRIVY_APP_ID } from "@/lib/config";
import { useTheme } from "@/lib/theme";
import { AuthContext, type Account, type Auth } from "./context";

const chain = config.explorerCluster ? ("solana:devnet" as const) : ("solana:mainnet" as const);
const connectors = toSolanaWalletConnectors({ shouldAutoConnect: true });
const rpcs = {
  [chain]: {
    rpc: createSolanaRpc(config.solanaRpc),
    rpcSubscriptions: createSolanaRpcSubscriptions(config.solanaRpc.replace(/^http/, "ws")),
    blockExplorerUrl: "https://explorer.solana.com",
  },
};

function toAccount(user: User, walletAddress: string | null): Account {
  const method = user.google ? "google" : user.email ? "email" : "wallet";
  return {
    id: user.id,
    name: user.google?.name ?? null,
    email: user.google?.email ?? user.email?.address ?? null,
    method,
    address: walletAddress ?? user.wallet?.address ?? null,
  };
}

function Bridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const { login } = useLogin();
  const { logout } = useLogout();
  const address = wallets[0]?.address ?? null;

  const value = useMemo<Auth>(
    () => ({
      status: !ready ? "loading" : authenticated && user ? "signedIn" : "guest",
      account: authenticated && user ? toAccount(user, address) : null,
      signIn: () => login({ loginMethods: ["google", "email"] }),
      connectWallet: () => login({ loginMethods: ["wallet"], walletChainType: "solana-only" }),
      signOut: logout,
    }),
    [ready, authenticated, user, address, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Privy: Google and email sign-in with an automatic Solana account, plus Solana wallets. */
export default function PrivyAuth({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "email", "wallet"],
        appearance: {
          theme,
          accentColor: "#FF5B1F",
          logo: theme === "dark" ? "/logo-white.png" : "/logo.png",
          landingHeader: "Sign in to BULL-XI",
          loginMessage: "Save your team and leagues on any device.",
          walletChainType: "solana-only",
          walletList: ["detected_solana_wallets", "phantom", "solflare", "backpack"],
        },
        embeddedWallets: { solana: { createOnLogin: "users-without-wallets" }, ethereum: { createOnLogin: "off" } },
        externalWallets: { solana: { connectors } },
        solana: { rpcs },
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  );
}
