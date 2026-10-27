import { mkdirSync, writeFileSync } from "node:fs";
import { ITEMS } from "../src/survival/items";
import { FIRE_SAFETY_STRINGS } from "../src/survival/safety";
import { fireTree } from "../src/survival/trees/fire";
import { bannedHits, validateTree } from "../src/survival/validator";

const report = validateTree(fireTree, { safety: FIRE_SAFETY_STRINGS, items: ITEMS });
const banned = bannedHits(JSON.stringify(fireTree));
mkdirSync("evidence/phase-1", { recursive: true });
const body = [
  `errors: ${report.errors.length}`,
  ...report.errors.map((line) => `ERROR ${line}`),
  `pictogram coverage: ${report.pictogram.coverage}`,
  `pictogram used: ${report.pictogram.used}`,
  `pictogram unknown: ${report.pictogram.unknown.join(", ") || "none"}`,
  `biomes: ${report.biomes.join(", ")}`,
  `banned hits: ${banned.join(", ") || "none"}`,
].join("\n");
writeFileSync("evidence/phase-1/validator.log", body + "\n");
console.log(body);
if (report.errors.length > 0 || banned.length > 0 || report.pictogram.coverage !== 1) {
  process.exit(1);
}
