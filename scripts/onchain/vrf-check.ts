/** Shows a gameweek's VRF state and golden stock on the TEE.
 *   npx tsx scripts/onchain/vrf-check.ts <gameweekId> */
import { config } from "../../lib/config";
import { NO_STOCK, readGameweek, stockId } from "../../lib/onchain/game";
void readGameweek(config.teeRpc, Number(process.argv[2])).then((g) =>
  console.log(g ? { status: g.status, vrfState: g.vrfState, golden: g.golden === NO_STOCK ? null : stockId(g.golden), picked: g.picked.toString(2) } : "not found"),
);
