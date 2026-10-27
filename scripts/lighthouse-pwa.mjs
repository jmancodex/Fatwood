import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { abortRoutedRequests, waitForPrecache } from "./offline-precache.mjs";

const url = process.env.LH_URL ?? "http://127.0.0.1:8081";

async function previewUp() {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

async function ensurePreview() {
  if (await previewUp()) return;
  const child = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "8081", "--strictPort"], {
    stdio: "ignore",
    detached: true,
  });
  child.unref();
  for (let i = 0; i < 80; i++) {
    if (await previewUp()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("preview did not start");
}

function auditScore(audits, id) {
  if (!audits || !(id in audits)) return "NOT RUN";
  const score = audits[id]?.score;
  return score === null || score === undefined ? "NOT RUN" : String(score);
}

mkdirSync("evidence/phase-1", { recursive: true });
await ensurePreview();

function findChrome() {
  const direct = chromium.executablePath();
  if (existsSync(direct)) return direct;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || "/opt/pw-browsers";
  const hits = [];
  const walk = (dir, depth) => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (!statSync(path).isDirectory()) {
        if (name === "chrome" || name === "chrome-headless-shell") hits.push(path);
        continue;
      }
      if (!name.includes(".")) walk(path, depth + 1);
    }
  };
  walk(root, 0);
  const shell = hits.find((path) => path.includes("headless_shell")) ?? hits[0];
  if (!shell) throw new Error("no Chrome binary for Lighthouse");
  return shell;
}

async function startChrome(port) {
  const child = spawn(
    findChrome(),
    ["--headless=new", "--no-sandbox", "--disable-gpu", `--remote-debugging-port=${port}`, "about:blank"],
    { stdio: "ignore" },
  );
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
      if (res.ok) return child;
    } catch {
      /* debugger not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  child.kill();
  throw new Error("Chrome debugger did not start");
}

const lighthouseMod = await import("lighthouse");
const lighthouse = lighthouseMod.default;
if (typeof lighthouse !== "function") {
  console.error(`lighthouse is not a function (${typeof lighthouse})`);
  process.exit(1);
}

const debugPort = 9333;
const chrome = await startChrome(debugPort);

let report;
try {
  let result;
  try {
    result = await lighthouse(url, {
      port: debugPort,
      output: "json",
      logLevel: "error",
      onlyCategories: ["pwa"],
    });
  } catch (error) {
    const message = String(error?.message ?? error);
    if (!/pwa|category/i.test(message)) throw error;
    result = await lighthouse(url, {
      port: debugPort,
      output: "json",
      logLevel: "error",
      onlyCategories: ["best-practices"],
    });
  }
  report = JSON.parse(result.report);
  writeFileSync("evidence/phase-1/lighthouse.json", result.report);
} finally {
  chrome.kill();
}

const audits = report.audits ?? {};
const pwa = report.categories?.pwa;
const lines = [
  `lighthouse: ${JSON.parse(readFileSync("node_modules/lighthouse/package.json", "utf8")).version}`,
  `pwa score: ${pwa ? pwa.score : "NOT RUN (category absent)"}`,
  `installable-manifest: ${auditScore(audits, "installable-manifest")}`,
  `service-worker: ${auditScore(audits, "service-worker")}`,
  `works-offline: ${auditScore(audits, "works-offline")}`,
];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ serviceWorkers: "allow" });
const page = await context.newPage();
await page.goto(url);
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
});
await page.reload();
await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
const client = await context.newCDPSession(page);
const installability = await client.send("Page.getInstallabilityErrors");
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return null;
  const response = await fetch(link.href);
  return response.json();
});
const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
await waitForPrecache(page);
await page.close();

const leaked = await abortRoutedRequests(context);
const cold = await context.newPage();
let coldStart = "FAIL";
try {
  await cold.goto(url);
  await cold.getByRole("heading", { name: "Where are you?" }).waitFor({ timeout: 15000 });
  coldStart = leaked.length === 0 ? "PASS" : "FAIL";
} catch (error) {
  coldStart = `FAIL ${error.message ?? error}`;
}
await browser.close();

const installabilityReport = {
  controlled,
  installabilityErrors: installability.installabilityErrors ?? installability,
  manifest: manifest
    ? {
        name: manifest.name,
        start_url: manifest.start_url,
        display: manifest.display,
        icons: (manifest.icons ?? []).map((icon) => ({ src: icon.src, sizes: icon.sizes, purpose: icon.purpose })),
      }
    : null,
  offlineColdStart: coldStart,
  leaked,
};
writeFileSync("evidence/phase-1/installability.json", JSON.stringify(installabilityReport, null, 2));

lines.push(`chrome installability errors: ${(installability.installabilityErrors ?? []).length}`);
lines.push(`offline cold start: ${coldStart}`);
if (leaked.length) lines.push(`leaked: ${leaked.join(" | ")}`);
let e2eNote = "NOT RUN (evidence/phase-1/e2e.log missing)";
try {
  const e2e = readFileSync("evidence/phase-1/e2e.log", "utf8");
  e2eNote = e2e.includes("PASS offline zero requests") ? "PASS (see e2e.log)" : "present, offline pass line missing";
} catch {
  /* e2e has not been run yet */
}
lines.push(`G1.8 e2e log: ${e2eNote}`);

const summary = lines.join("\n");
writeFileSync("evidence/phase-1/lighthouse-summary.txt", summary + "\n");
mkdirSync("evidence/phase-1b", { recursive: true });
writeFileSync("evidence/phase-1b/lighthouse-summary.txt", summary + "\n");
writeFileSync("evidence/phase-1b/installability.json", JSON.stringify(installabilityReport, null, 2));
console.log(summary);

const iconSizes = new Set((manifest?.icons ?? []).flatMap((icon) => String(icon.sizes ?? "").split(/\s+/)));
const manifestOk =
  manifest &&
  manifest.name &&
  manifest.start_url &&
  ["standalone", "fullscreen", "minimal-ui"].includes(manifest.display) &&
  iconSizes.has("192x192") &&
  iconSizes.has("512x512");
const chromeOk = (installability.installabilityErrors ?? []).length === 0 && controlled && manifestOk;
const namedAuditsPresent = audits["service-worker"] && audits["works-offline"] && audits["installable-manifest"];
const lighthouseOk = namedAuditsPresent
  ? audits["service-worker"].score === 1 &&
    audits["works-offline"].score === 1 &&
    audits["installable-manifest"].score === 1 &&
    pwa?.score === 1
  : chromeOk && coldStart === "PASS";

if (!lighthouseOk) process.exit(1);
