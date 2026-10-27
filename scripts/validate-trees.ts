import { mkdirSync, writeFileSync } from "node:fs";
import { ITEMS } from "../src/survival/items";
import { FIRE_SAFETY_STRINGS, WATER_SAFETY_STRINGS } from "../src/survival/safety";
import { fireTree } from "../src/survival/trees/fire";
import { waterTree } from "../src/survival/trees/water";
import { bannedHits, validateTree } from "../src/survival/validator";

function writeReport(dir: string, tree: typeof fireTree, safety: readonly string[]) {
  const report = validateTree(tree, { safety, items: ITEMS });
  const banned = bannedHits(JSON.stringify(tree));
  mkdirSync(dir, { recursive: true });
  const body = [
    `tree: ${tree.id}`,
    `errors: ${report.errors.length}`,
    ...report.errors.map((line) => `ERROR ${line}`),
    `pictogram coverage: ${report.pictogram.coverage}`,
    `pictogram used: ${report.pictogram.used}`,
    `pictogram unknown: ${report.pictogram.unknown.join(", ") || "none"}`,
    `biomes: ${report.biomes.join(", ")}`,
    `banned hits: ${banned.join(", ") || "none"}`,
  ].join("\n");
  writeFileSync(`${dir}/validator.log`, body + "\n");
  console.log(body);
  console.log("");
  return report.errors.length > 0 || banned.length > 0 || report.pictogram.coverage !== 1;
}

const fireFailed = writeReport("evidence/phase-1", fireTree, FIRE_SAFETY_STRINGS);
const waterFailed = writeReport("evidence/phase-2", waterTree, WATER_SAFETY_STRINGS);
if (fireFailed || waterFailed) process.exit(1);
