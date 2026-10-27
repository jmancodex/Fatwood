import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { abortRoutedRequests, waitForPrecache } from "../scripts/offline-precache.mjs";

const BASE = "http://127.0.0.1:8081";
mkdirSync("evidence/phase-1", { recursive: true });
const lines = [];

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

async function openWater(page) {
  await button(page, "I need").click();
  await button(page, "Water").click();
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

async function assertPreviewPortFree() {
  const used = await new Promise((resolve) => {
    const socket = net.connect({ port: 8081, host: "127.0.0.1" });
    const finish = (value) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
  if (used) {
    throw new Error("port 8081 is already in use; stop the other preview before e2e");
  }
}

try {
  await assertPreviewPortFree();
} catch (error) {
  log(`FAIL ${error instanceof Error ? error.message : error}`);
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  process.exit(1);
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
    ["Water", true],
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

  await reset(page);
  await onboard(page, "Temperate forest", "Dry");
  await addGear(page, "Bleach");
  await button(page, "Settings").click();
  await page.getByRole("checkbox", { name: "Kid mode" }).check();
  await button(page, "Back").click();
  await openWater(page);
  await button(page, "I drank today").click();
  await button(page, "Stream").click();
  await button(page, "Make it safe").click();
  await button(page, "Use drops").click();
  await page.getByTestId("grownup-gate").waitFor();
  if ((await page.getByText("2 drops each liter").count()) !== 0) throw new Error("kid mode showed the bleach dose");
  const waterHold = button(page, "Press and hold to show the steps");
  await waterHold.scrollIntoViewIfNeeded();
  const waterBox = await waterHold.boundingBox();
  if (!waterBox || waterBox.height < 48 || waterBox.width < 48) throw new Error(`water tap target ${JSON.stringify(waterBox)}`);
  await page.mouse.move(waterBox.x + waterBox.width / 2, waterBox.y + waterBox.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.getByText("2 drops each liter").waitFor();
  log("PASS water kid gate");

  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.locator("[data-ready=yes]").waitFor();
  await waitForPrecache(page);
  await page.close();

  const leaked = await abortRoutedRequests(context);
  const cold = await context.newPage();
  cold.on("pageerror", (error) => errors.push(String(error)));
  await cold.goto(BASE);
  await cold.getByRole("heading", { name: "Where are you?" }).waitFor();

  await onboard(cold, "Boreal / snow", "Wet");
  await addGear(cold, "Ferro rod");
  await openFire(cold);
  await button(cold, "Warmth or hypothermia").click();
  await button(cold, "Choose the fire for these conditions").click();
  await button(cold, "Wet").click();
  await button(cold, "Gather tinder, kindling, and fuel").click();
  await cold.getByText(/fatwood|birch/i).first().waitFor();
  await button(cold, "Choose how you will light it").click();
  await button(cold, "Ferro rod").click();
  await finish(cold, "Lean-to");
  log("PASS golden a");

  await reset(cold);
  await onboard(cold, "Desert", "Dry");
  await openFire(cold);
  await button(cold, "Warmth or hypothermia").click();
  await button(cold, "Choose the fire for these conditions").click();
  await button(cold, "No wood").click();
  await cold.getByText(/dung|grass/i).first().waitFor();
  await button(cold, "Pick the site").click();
  await button(cold, "Gather tinder, kindling, and fuel").click();
  await button(cold, "Choose how you will light it").click();
  await button(cold, "Hand drill").click();
  await cold.getByText("no-gear method for dry climates").waitFor();
  await finish(cold, "Teepee");
  log("PASS golden b");

  await reset(cold);
  await onboard(cold, "Coast", "Dry");
  await addGear(cold, "Lighter");
  await openFire(cold);
  await button(cold, "Warmth or hypothermia").click();
  await button(cold, "Choose the fire for these conditions").click();
  await button(cold, "Dry").click();
  await button(cold, "Gather tinder, kindling, and fuel").click();
  await cold.getByText("high-tide line").first().waitFor();
  await button(cold, "Choose how you will light it").click();
  await button(cold, "Lighter").click();
  await finish(cold, "Teepee");
  log("PASS golden c");

  await reset(cold);
  await onboard(cold, "Boreal / snow", "Freezing");
  await addGear(cold, "Matches");
  await openFire(cold);
  await button(cold, "Warmth or hypothermia").click();
  await button(cold, "Choose the fire for these conditions").click();
  await button(cold, "Snow").click();
  await button(cold, "Gather tinder, kindling, and fuel").click();
  await button(cold, "Choose how you will light it").click();
  await button(cold, "Matches").click();
  await button(cold, "Choose the fire lay").click();
  await button(cold, "Platform on snow").click();
  const order = await cold.locator("article").evaluate((element) => {
    const text = element.textContent ?? "";
    return { warning: text.indexOf("carbon monoxide"), step: text.indexOf("Lay two crosswise") };
  });
  if (!(order.warning >= 0 && order.step > order.warning)) throw new Error(`order ${JSON.stringify(order)}`);
  await button(cold, "If it struggles, troubleshoot").click();
  await button(cold, "It is burning steadily").click();
  await button(cold, "Extinguish before you leave").click();
  await cold.getByText("Fully extinguish: drown, stir, drown again").waitFor();
  log("PASS golden d");

  await reset(cold);
  await onboard(cold, "Tropical jungle", "Wet");
  await openFire(cold);
  await button(cold, "Warmth or hypothermia").click();
  await button(cold, "Choose the fire for these conditions").click();
  await button(cold, "Wet").click();
  await button(cold, "Gather tinder, kindling, and fuel").click();
  await button(cold, "Choose how you will light it").click();
  await button(cold, "Bow drill").click();
  await cold.getByText("no-gear method").first().waitFor();
  log("PASS golden e");

  await reset(cold);
  await onboard(cold, "Desert", "Hot");
  await openWater(cold);
  await button(cold, "I drank today").click();
  await button(cold, "Dig a dry wash").click();
  await cold.getByText("outer bend").first().waitFor();
  await button(cold, "Disinfect what you dug").click();
  await button(cold, "Sunlight in a clear bottle").click();
  await cold.getByText("6 hours of full sun").waitFor();
  await cold.getByText("2 days").waitFor();
  await button(cold, "Store and ration").click();
  await cold.getByText("Ration sweat, not water").waitFor();
  log("PASS water desert");

  await reset(cold);
  await onboard(cold, "Boreal / snow", "Freezing");
  await addGear(cold, "Stove");
  await openWater(cold);
  await button(cold, "I drank today").click();
  await button(cold, "Melt snow").click();
  await cold.getByText("Do not eat snow or ice to hydrate").waitFor();
  await button(cold, "Boil it on the stove").click();
  await cold.getByText("Boil at a rolling boil for 1 minute").waitFor();
  await button(cold, "Store and ration").click();
  log("PASS water boreal");

  await reset(cold);
  await onboard(cold, "Coast", "Dry");
  await openWater(cold);
  await button(cold, "I drank today").click();
  await button(cold, "Dig a beach well").click();
  await cold.getByText("Never drink seawater or urine.").waitFor();
  await button(cold, "Boil the beach-well water").click();
  await cold.getByText("Boil at a rolling boil for 1 minute").waitFor();
  log("PASS water coastal");

  await reset(cold);
  await onboard(cold, "Urban ruin", "Dry");
  await openWater(cold);
  await button(cold, "I drank today").click();
  await button(cold, "Water heater tank").click();
  await cold.getByText("toilet tank").first().waitFor();
  await cold.getByText("bowl is never drinking water").waitFor();
  log("PASS water urban");

  if (leaked.length) throw new Error(`network after offline: ${leaked.join(" | ")}`);
  if (errors.length) throw new Error(errors.join(" | "));
  log("PASS offline zero requests of any origin");
  const body = lines.join("\n") + "\n";
  writeFileSync("evidence/phase-1/e2e.log", body);
  mkdirSync("evidence/phase-2", { recursive: true });
  writeFileSync("evidence/phase-2/e2e.log", body);
  await browser.close();
  process.exit(0);
} catch (error) {
  log(`FAIL ${error.stack || error}`);
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  process.exit(1);
}
