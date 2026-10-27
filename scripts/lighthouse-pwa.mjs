import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const url = process.env.LH_URL ?? "http://127.0.0.1:8081";
const prefix = "/tmp/lh";
if (!existsSync(`${prefix}/node_modules/lighthouse/package.json`)) {
  spawnSync("npm", ["install", "lighthouse@11.7.1", "--prefix", prefix], { stdio: "inherit" });
}
const require = createRequire(`${prefix}/package.json`);
const lighthouse = require("lighthouse");

mkdirSync("evidence/phase-1", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ["--remote-debugging-port=9223"],
});

try {
  const result = await lighthouse(url, {
    port: 9223,
    output: "json",
    onlyCategories: ["pwa"],
    logLevel: "error",
  });
  const report = JSON.parse(result.report);
  writeFileSync("evidence/phase-1/lighthouse.json", result.report);
  const audits = report.audits ?? {};
  const refs = report.categories?.pwa?.auditRefs ?? [];
  const lines = [`lighthouse: ${require("lighthouse/package.json").version}`, `pwa score: ${report.categories?.pwa?.score}`];
  for (const ref of refs) {
    const audit = audits[ref.id];
    if (!audit || audit.score === null) continue;
    lines.push(`${ref.id}: ${audit.score} ${audit.title}`);
  }
  const summary = lines.join("\n");
  writeFileSync("evidence/phase-1/lighthouse-summary.txt", summary + "\n");
  console.log(summary);
  if (report.categories?.pwa?.score !== 1) process.exit(1);
  if (audits["installable-manifest"]?.score !== 1) process.exit(1);
} finally {
  await browser.close();
}
