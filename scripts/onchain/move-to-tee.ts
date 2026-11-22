/**
 * One-time admin step for checkpoint 2:
 *   1. undelegate the price book from the Asia ER (commit + hand back to Solana)
 *   2. delegate it to the MagicBlock TEE (Private ER), where the game runs
 *   3. create the game config (admin = deployer, crank = pusher key)
 *
 *   npx tsx scripts/onchain/move-to-tee.ts
 */
import { address, createSolanaRpc } from "@solana/kit";
import { config, explorer } from "../../lib/config";
import { findConfigPda, getDelegatePriceBookInstructionAsync, getInitConfigInstructionAsync, getUndelegatePriceBookInstructionAsync, BULLXI_PROGRAM_ADDRESS } from "../../lib/onchain/bullxi";
import { priceBookAddress, DELEGATION_PROGRAM_ID } from "../../lib/onchain/price-book";
import { sendAndConfirm, waitForOwner, withRemaining } from "../../lib/onchain/send";
import { loadSigner } from "./common";

const ASIA_ER = "https://devnet-as.magicblock.app";

async function main() {
  const admin = await loadSigner("deployer");
  const pusher = await loadSigner("pusher");
  const book = await priceBookAddress();
  const base = createSolanaRpc(config.solanaRpc);

  // 1. Is it on the TEE already? The delegation record says which validator holds it.
  const owner = (await base.getAccountInfo(book, { encoding: "base64" }).send()).value?.owner;
  console.log("price book owner on Solana:", owner);
  if (owner === DELEGATION_PROGRAM_ID && process.argv.includes("--from-asia")) {
    const sig = await sendAndConfirm(ASIA_ER, admin, [await getUndelegatePriceBookInstructionAsync({ payer: admin })]);
    console.log("undelegate scheduled on Asia ER", explorer("tx", sig, { er: true }));
    await waitForOwner(config.solanaRpc, book, BULLXI_PROGRAM_ADDRESS);
    console.log("price book is back on Solana");
  }

  const now = (await base.getAccountInfo(book, { encoding: "base64" }).send()).value?.owner;
  if (now === BULLXI_PROGRAM_ADDRESS) {
    const ix = withRemaining(await getDelegatePriceBookInstructionAsync({ payer: admin, pda: book }), address(config.teeValidator));
    const sig = await sendAndConfirm(config.solanaRpc, admin, [ix]);
    console.log("delegated to the TEE", explorer("tx", sig));
  }

  // 3. Game config
  const [cfg] = await findConfigPda();
  if (!(await base.getAccountInfo(cfg, { encoding: "base64" }).send()).value) {
    const sig = await sendAndConfirm(config.solanaRpc, admin, [await getInitConfigInstructionAsync({ admin, crank: pusher.address })]);
    console.log("config created", explorer("tx", sig));
  }
  console.log("config", explorer("address", cfg));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
