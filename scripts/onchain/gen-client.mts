/**
 * Generates the typed @solana/kit client for the bullxi program from its IDL.
 *   npm run onchain:client
 */
import { cpSync, readFileSync, rmSync } from "node:fs";
import { createFromRoot } from "codama";
import { rootNodeFromAnchor, type AnchorIdl } from "@codama/nodes-from-anchor";
import { renderVisitor } from "@codama/renderers-js";

const idl = JSON.parse(readFileSync("onchain/idl/bullxi.json", "utf8")) as AnchorIdl;
const codama = createFromRoot(rootNodeFromAnchor(idl));
const tmp = "node_modules/.cache/bullxi-client";
await codama.accept(renderVisitor(tmp, { deleteFolderBeforeRendering: true, formatCode: true }));
rmSync("lib/onchain/bullxi", { recursive: true, force: true });
cpSync(`${tmp}/src/generated`, "lib/onchain/bullxi", { recursive: true });
console.log("wrote lib/onchain/bullxi");
