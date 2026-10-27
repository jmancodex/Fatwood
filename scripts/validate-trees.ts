import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { ITEMS } from "../src/survival/items";
import { FIRE_SAFETY_STRINGS } from "../src/survival/safety";
import type { Glossary, Skill } from "../src/survival/skills/types";
import { validateTeach } from "../src/survival/skills/validate";
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

const skills = readdirSync("content/skills")
  .filter((file) => file.endsWith(".json"))
  .map((file) => JSON.parse(readFileSync(`content/skills/${file}`, "utf8")) as Skill);
const glossary = JSON.parse(readFileSync("content/glossary.json", "utf8")) as Glossary;
const teach = validateTeach([fireTree], skills, glossary);
const skillBlob = JSON.stringify({ skills, glossary });
const skillBanned = bannedHits(skillBlob);
const urlHits = skillBlob.match(/https?:\/\//gi) ?? [];
if (skillBanned.length) teach.errors.push(`banned tokens: ${skillBanned.join(", ")}`);
if (urlHits.length) teach.errors.push("skill content contains a URL");

const readout = [
  "id | title | mean | max | steps | safety | mistakes",
  ...teach.readout.map(
    (row) =>
      `${row.id} | ${row.title} | ${row.mean.toFixed(2)} | ${row.max.toFixed(2)} | ${row.steps.length} | ${row.safety.length} | ${row.mistakes.length}`,
  ),
  "",
  "kind | id | grade | words | text",
  ...teach.readout.flatMap((row) => [
    ...row.steps.map((line) => `step | ${row.id} | ${line.grade.toFixed(2)} | ${line.words} | ${line.text}`),
    ...row.safety.map((line) => `safety | ${row.id} | ${line.grade.toFixed(2)} | ${line.words} | ${line.text}`),
    ...row.mistakes.map((line) => `mistake | ${row.id} | ${line.grade.toFixed(2)} | ${line.words} | ${line.text}`),
  ]),
];
const teachBody = [
  `actionable: ${teach.actionable}`,
  `linked: ${teach.linked}`,
  `atomic: ${teach.atomic}`,
  `coverage: ${teach.coverage}`,
  `unknown: ${teach.unknown.join(", ") || "none"}`,
  `orphans: ${teach.orphans.join(", ") || "none"}`,
  `danger skills without safety: ${teach.dangerWithoutSafety.length}`,
  `atomic steps on danger nodes: ${teach.atomicOnDanger.length}`,
  `errors: ${teach.errors.length}`,
  ...teach.errors.map((line) => `ERROR ${line}`),
  "",
  ...readout,
].join("\n");
mkdirSync("evidence/phase-1b", { recursive: true });
writeFileSync("evidence/phase-1b/validator.log", teachBody + "\n");
writeFileSync("evidence/phase-1b/readability.txt", readout.join("\n") + "\n");
console.log(teachBody);

if (report.errors.length > 0 || banned.length > 0 || report.pictogram.coverage !== 1 || teach.errors.length > 0 || teach.coverage !== 1) {
  process.exit(1);
}
