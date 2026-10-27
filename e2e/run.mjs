import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const BASE = "http://127.0.0.1:8081";
mkdirSync("evidence/phase-1", { recursive: true });
const lines = [];
const network = [];

function log(line) {
  lines.push(line);
  console.log(line);
}

async function waitForPreview() {
  for (let i = 0; i < 80; i++) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(1500) });
      if (res.ok) return;
    } catch {
      /* preview still booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("preview did not start");
}

function button(page, name) {
  return page.getByRole("button", { name });
}

async function clearAndOpen(page) {
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("heading", { name: "Where are you?" }).waitFor();
}

async function onboard(page, biome, weather) {
  await button(page, biome).click();
  await button(page, new RegExp(weather, "i")).click();
  await button(page, "This is where I am").click();
  await button(page, "I need").waitFor();
}

async function addGear(page, name) {
  await button(page, "What I have").click();
  await button(page, name).click();
  await button(page, "Back").click();
}

async function openFire(page) {
  await button(page, "I need").click();
  await button(page, "Fire").click();
}

async function finish(page, lay) {
  await button(page, "Choose the fire lay").click();
  await button(page, lay).click();
  await button(page, "If it struggles, troubleshoot").click();
  await button(page, "It is burning steadily").click();
  await button(page, "Extinguish before you leave").click();
  await page.getByText("Fully extinguish: drown, stir, drown again").waitFor();
}

async function reset(page) {
  await button(page, "Back").click();
  await button(page, "Settings").click();
  await button(page, "Reset this guide").click();
  await page.getByRole("heading", { name: "Where are you?" }).waitFor();
}

const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "8081", "--strictPort"], {
  stdio: "ignore",
  detached: true,
});
preview.unref();

try {
  await waitForPreview();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "allow" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));

  await page.emulateMedia({ reducedMotion: "reduce" });
  await clearAndOpen(page);
  for (const name of ["Temperate forest", "Boreal / snow", "Desert", "Tropical jungle", "Grassland", "Coast", "Alpine", "Urban ruin"]) {
    await button(page, name).waitFor();
  }
  await onboard(page, "Temperate forest", "Dry");
  if (!(await button(page, "I want").isVisible())) throw new Error("missing I want");
  if (!(await button(page, "First aid").isDisabled())) throw new Error("first aid should be disabled");
  await button(page, "I need").click();
  for (const [name, enabled] of [
    ["Water", false],
    ["Food", false],
    ["Fire", true],
    ["Shelter", false],
    ["Signaling and navigation", false],
  ]) {
    const target = button(page, name);
    if ((await target.isEnabled()) !== enabled) throw new Error(`${name} enabled state`);
  }
  await button(page, "Back").click();
  await button(page, "Settings").click();
  await page.getByRole("checkbox", { name: "Red night vision" }).check();
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (theme !== "night") throw new Error(`theme ${theme}`);
  const motion = await page.evaluate(() => getComputedStyle(document.documentElement).animationDuration);
  const motionSeconds = Number.parseFloat(motion);
  if (!(motionSeconds <= 0.05)) throw new Error(`motion ${motion}`);
  const axe = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  const serious = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  writeFileSync("evidence/phase-1/axe.json", JSON.stringify({ violations: serious, incomplete: axe.incomplete?.length ?? 0 }, null, 2));
  if (serious.length) throw new Error(`axe ${serious.map((item) => item.id).join(",")}`);
  log("PASS shell axe night motion");

  await button(page, "Back").click();
  await button(page, "Settings").click();
  await page.getByRole("checkbox", { name: "Kid mode" }).check();
  await button(page, "Back").click();
  await openFire(page);
  await button(page, "Someone is too cold").click();
  await page.getByText("Someone is too cold. Block the wind").waitFor();
  await button(page, "Next").click();
  await button(page, "Dry").click();
  await page.getByTestId("grownup-gate").waitFor();
  if ((await page.getByText("Look up. Do not build under dead branches").count()) !== 0) {
    throw new Error("kid mode revealed adult steps");
  }
  const hold = button(page, "Press and hold to show the steps");
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  if (!box || box.height < 48 || box.width < 48) throw new Error(`tap target ${JSON.stringify(box)}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.getByText("Look up for dead branches.").waitFor();
  log("PASS kid gate");

  await reset(page);
  await onboard(page, "Coast", "Dry");
  await openFire(page);
  await button(page, "Warmth or hypothermia").click();
  await page.waitForTimeout(300);
  await page.reload();
  await page.locator("[data-node='fire.hypothermia']").waitFor();
  log("PASS save resume");

  await page.goto(BASE);
  await page.locator("[data-ready=yes]").waitFor();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  page.on("response", (response) => {
    if (response.url().startsWith(BASE) && !response.fromServiceWorker()) network.push(response.url());
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByText("Fatwood").first().waitFor();

  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("heading", { name: "Where are you?" }).waitFor();
  await onboard(page, "Boreal / snow", "Wet");
  await addGear(page, "Ferro rod");
  await openFire(page);
  await button(page, "Warmth or hypothermia").click();
  await button(page, "Choose the fire for these conditions").click();
  await button(page, "Wet").click();
  await button(page, "Gather tinder, kindling, and fuel").click();
  await page.getByText(/fatwood|birch/i).first().waitFor();
  await button(page, "Choose how you will light it").click();
  await button(page, "Ferro rod").click();
  await finish(page, "Lean-to");
  log("PASS golden a");

  await reset(page);
  await onboard(page, "Desert", "Dry");
  await openFire(page);
  await button(page, "Warmth or hypothermia").click();
  await button(page, "Choose the fire for these conditions").click();
  await button(page, "No wood").click();
  await page.getByText(/dung|grass/i).first().waitFor();
  await button(page, "Pick the site").click();
  await button(page, "Gather tinder, kindling, and fuel").click();
  await button(page, "Choose how you will light it").click();
  await button(page, "Hand drill").click();
  await page.getByText("no-gear method for dry climates").waitFor();
  await finish(page, "Teepee");
  log("PASS golden b");

  await reset(page);
  await onboard(page, "Coast", "Dry");
  await addGear(page, "Lighter");
  await openFire(page);
  await button(page, "Warmth or hypothermia").click();
  await button(page, "Choose the fire for these conditions").click();
  await button(page, "Dry").click();
  await button(page, "Gather tinder, kindling, and fuel").click();
  await page.getByText("high-tide line").first().waitFor();
  await button(page, "Choose how you will light it").click();
  await button(page, "Lighter").click();
  await finish(page, "Teepee");
  log("PASS golden c");

  await reset(page);
  await onboard(page, "Boreal / snow", "Freezing");
  await addGear(page, "Matches");
  await openFire(page);
  await button(page, "Warmth or hypothermia").click();
  await button(page, "Choose the fire for these conditions").click();
  await button(page, "Snow").click();
  await button(page, "Gather tinder, kindling, and fuel").click();
  await button(page, "Choose how you will light it").click();
  await button(page, "Matches").click();
  await button(page, "Choose the fire lay").click();
  await button(page, "Platform on snow").click();
  const order = await page.locator("article").evaluate((element) => {
    const text = element.textContent ?? "";
    return { warning: text.indexOf("carbon monoxide"), step: text.indexOf("Lay two crosswise") };
  });
  if (!(order.warning >= 0 && order.step > order.warning)) throw new Error(`order ${JSON.stringify(order)}`);
  await button(page, "If it struggles, troubleshoot").click();
  await button(page, "It is burning steadily").click();
  await button(page, "Extinguish before you leave").click();
  await page.getByText("Fully extinguish: drown, stir, drown again").waitFor();
  log("PASS golden d");

  await reset(page);
  await onboard(page, "Tropical jungle", "Wet");
  await openFire(page);
  await button(page, "Warmth or hypothermia").click();
  await button(page, "Choose the fire for these conditions").click();
  await button(page, "Wet").click();
  await button(page, "Gather tinder, kindling, and fuel").click();
  await button(page, "Choose how you will light it").click();
  await button(page, "Bow drill").click();
  await page.getByText("no-gear method").first().waitFor();
  log("PASS golden e");

  if (network.length) throw new Error(`network after offline: ${network.join(" | ")}`);
  if (errors.length) throw new Error(errors.join(" | "));
  log("PASS offline zero same-origin network");
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  await browser.close();
  process.exit(0);
} catch (error) {
  log(`FAIL ${error.stack || error}`);
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  process.exit(1);
}
