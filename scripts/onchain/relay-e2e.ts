/**
 * Seals a squad through the same code the app runs (lib/data/onchain.ts) and
 * the game Worker's /relay, with a brand-new player that has no SOL.
 *   NEXT_PUBLIC_GAME_API=http://localhost:8787 npx tsx scripts/onchain/relay-e2e.ts
 */
import { generateKeyPairSigner, getTransactionDecoder, getTransactionEncoder, signBytes, type SignatureBytes } from "@solana/kit";
import { explorer, GAME_API } from "../../lib/config";
import { getManagerRecord, sealSquadOnchain } from "../../lib/data/onchain";
import { MOCK_STOCKS, MOCK_STOCKS_BY_ID } from "../../lib/data/mock/stocks";
import { mulberry32 } from "../../lib/data/mock/rng";
import { autoPick } from "../../lib/game/autopick";
import { defaultLineup, emptySquad, squadIds } from "../../lib/game/rules";
import { dailyDeadline } from "../../lib/onchain/crank";

async function main() {
  const kp = await generateKeyPairSigner();
  const player = {
    address: kp.address as string,
    signMessage: (m: Uint8Array) => signBytes(kp.keyPair.privateKey, m),
    // What Privy does: add the player's signature to a serialized transaction.
    signTransaction: async (wire: Uint8Array) => {
      const tx = getTransactionDecoder().decode(wire);
      const sig = (await signBytes(kp.keyPair.privateKey, tx.messageBytes)) as SignatureBytes;
      return new Uint8Array(getTransactionEncoder().encode({ ...tx, signatures: { ...tx.signatures, [kp.address]: sig } }));
    },
  };
  const slots = autoPick(MOCK_STOCKS, emptySquad(), mulberry32(11));
  const lineup = defaultLineup(slots, (id) => MOCK_STOCKS_BY_ID[id]?.credits ?? 0);
  const deadline = new Date(dailyDeadline(Date.now())).toISOString();
  console.log("game API", GAME_API, "| player", kp.address, "| deadline", deadline);
  const t0 = Date.now();
  const r = await sealSquadOnchain(player, {
    kind: "daily",
    deadline,
    managerName: "Relay Tester",
    teamName: "Sponsored XI",
    squad: squadIds(slots),
    starters: lineup.starters,
    bench: lineup.bench,
    captainId: lineup.captainId,
    viceId: lineup.viceId,
  });
  console.log(`sealed gameweek ${r.gameweek} in ${((Date.now() - t0) / 1000).toFixed(1)}s`, explorer("address", r.address));
  console.log("public record:", await getManagerRecord(kp.address));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
