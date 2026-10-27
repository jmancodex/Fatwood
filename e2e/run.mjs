import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import net from "node:net";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";
import { abortRoutedRequests, waitForPrecache } from "../scripts/offline-precache.mjs";

const BASE = "http://127.0.0.1:8081";
mkdirSync("evidence/phase-1", { recursive: true });
mkdirSync("evidence/phase-1b", { recursive: true });
const lines = [];

function log(line) {
  lines.push(line);
  console.log(line);
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: "127.0.0.1", port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
  });
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
  const matches = page.getByRole("button", { name });
  return {
    click: async () => {
      const count = await matches.count();
      if (count <= 1) {
        await matches.click();
        return;
      }
      const option = page.locator("button.bg-accent").filter({ hasText: name });
      if ((await option.count()) === 1) {
        await option.click();
        return;
      }
      await matches.click();
    },
    waitFor: (...args) => matches.first().waitFor(...args),
    isVisible: () => matches.first().isVisible(),
    isDisabled: () => matches.first().isDisabled(),
    isEnabled: () => matches.first().isEnabled(),
    scrollIntoViewIfNeeded: () => matches.first().scrollIntoViewIfNeeded(),
    boundingBox: () => matches.first().boundingBox(),
    getAttribute: (attr) => matches.first().getAttribute(attr),
  };
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

async function pointerHold(page, locator, ms, move = 0) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error("missing hold target");
  const x = box.x + Math.min(16, box.width / 2);
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  if (move) await page.mouse.move(x + move, y + 2);
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function liftClearOfBar(page, locator) {
  const handle = await locator.elementHandle();
  if (!handle) throw new Error("missing hit target");
  await page.evaluate((el) => {
    const bar = document.querySelector("[data-action-bar]");
    const barTop = bar ? bar.getBoundingClientRect().top : window.innerHeight;
    const rect = el.getBoundingClientRect();
    if (rect.bottom > barTop - 8) window.scrollBy(0, rect.bottom - (barTop - 12));
    const next = el.getBoundingClientRect();
    if (next.top < 4) window.scrollBy(0, next.top - 8);
  }, handle);
}

async function assertFullyHittable(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await liftClearOfBar(page, locator);
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) throw new Error("missing box");
  if (box.width < 48 || box.height < 48) throw new Error(`tap target ${Math.round(box.width)}x${Math.round(box.height)}`);
  if (box.x < 0 || box.y < 0 || box.x + box.width > viewport.width + 1 || box.y + box.height > viewport.height + 1) {
    throw new Error(`clipped ${JSON.stringify(box)} in ${viewport.width}x${viewport.height}`);
  }
  const label = ((await locator.innerText()) || "").replace(/\s+/g, " ").trim();
  const points = [
    [box.x + 4, box.y + 4],
    [box.x + box.width / 2, box.y + box.height / 2],
    [box.x + box.width - 4, box.y + box.height - 4],
  ];
  for (const [x, y] of points) {
    const hit = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      const button = el && el.closest("button");
      return button ? (button.innerText || "").replace(/\s+/g, " ").trim() : "none";
    }, { x, y });
    if (!hit.includes(label.slice(0, 18))) {
      throw new Error(`not hittable at ${viewport.width}x${viewport.height}: ${label} got ${hit}`);
    }
  }
}

async function expandOpenSkills(page) {
  for (let round = 0; round < 6; round += 1) {
    const buttons = page.getByRole("button", { name: /Show me how:/ });
    const count = await buttons.count();
    let opened = false;
    for (let index = 0; index < count; index += 1) {
      const item = buttons.nth(index);
      if ((await item.getAttribute("aria-expanded")) === "false" && (await item.isEnabled())) {
        await item.scrollIntoViewIfNeeded();
        await item.click();
        opened = true;
      }
    }
    if (!opened) return;
  }
  throw new Error("skills did not finish expanding");
}

if (await portOpen(8081)) {
  log("FAIL port 8081 is already in use");
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  writeFileSync("evidence/phase-1b/e2e.log", lines.join("\n") + "\n");
  process.exit(1);
}

const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "8081", "--strictPort"], {
  stdio: "ignore",
  detached: true,
});
preview.unref();

function stopPreview() {
  if (!preview.pid) return;
  try {
    process.kill(-preview.pid, "SIGTERM");
  } catch {
    try {
      preview.kill("SIGTERM");
    } catch {
      /* already stopped */
    }
  }
}

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
  const hold = button(page, "Get a grown-up: hold 3 seconds");
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  if (!box || box.height < 48 || box.width < 48) throw new Error(`tap target ${JSON.stringify(box)}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3200);
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

  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE);
  await page.locator("[data-ready=yes]").waitFor();
  await waitForPrecache(page);
  await page.close();

  const leaked = await abortRoutedRequests(context);
  const cold = await context.newPage();
  cold.on("pageerror", (error) => errors.push(String(error)));
  await cold.setViewportSize({ width: 430, height: 900 });
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
  await expandOpenSkills(cold);
  const knife = cold.getByRole("button", { name: "Show me how: Hold a knife safely" });
  if ((await knife.getAttribute("aria-expanded")) !== "true") throw new Error("depth 3 skill did not expand");
  await cold.getByText("Cut away from your legs.").waitFor();
  await cold.setViewportSize({ width: 430, height: 900 });
  await cold.locator("[data-node='fire.materials']").screenshot({ path: "evidence/phase-1b/skill-normal.png" });
  await cold.reload();
  await cold.locator("[data-node='fire.materials']").waitFor();
  await cold.getByText("Cut away from your legs.").waitFor();
  await button(cold, "Show me how: Process fatwood").click();
  if ((await cold.getByText("Split the pine knot to the shiny core.").count()) !== 0) throw new Error("collapse left the skill open");
  const handle = cold.locator("[data-step='fire.materials.m4'] [data-hold-handle]");
  await pointerHold(cold, handle, 200);
  if ((await cold.getByText("Split the pine knot to the shiny core.").count()) !== 0) throw new Error("200ms hold expanded the skill");
  await pointerHold(cold, handle, 800, 28);
  if ((await cold.getByText("Split the pine knot to the shiny core.").count()) !== 0) throw new Error("moved finger expanded the skill");
  await pointerHold(cold, handle, 800);
  await cold.getByText("Split the pine knot to the shiny core.").waitFor();
  await expandOpenSkills(cold);
  const teachAxe = await new AxeBuilder({ page: cold }).withTags(["wcag2aa"]).analyze();
  const teachSerious = teachAxe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  writeFileSync(
    "evidence/phase-1b/axe.json",
    JSON.stringify({ violations: teachSerious, incomplete: teachAxe.incomplete?.length ?? 0 }, null, 2),
  );
  if (teachSerious.length) throw new Error(`teach axe ${teachSerious.map((item) => item.id).join(",")}`);
  log("PASS teach expand reload hold depth axe");

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
  await onboard(cold, "Temperate forest", "Dry");
  await button(cold, "Settings").click();
  await cold.getByRole("checkbox", { name: "Kid mode" }).check();
  await button(cold, "Back").click();
  await openFire(cold);
  await button(cold, "Someone is too cold").click();
  await cold.getByText("A small fire close by.").waitFor();
  for (const [width, height] of [
    [360, 640],
    [390, 844],
    [430, 900],
  ]) {
    await cold.setViewportSize({ width, height });
    await cold.waitForTimeout(100);
    const showButtons = cold.getByRole("button", { name: /Show me how:/ });
    const total = await showButtons.count();
    if (total < 1) throw new Error(`no show-me buttons at ${width}x${height}`);
    for (let index = 0; index < total; index += 1) {
      await assertFullyHittable(cold, showButtons.nth(index));
    }
    await assertFullyHittable(cold, cold.getByRole("button", { name: "Get a grown-up: hold 3 seconds" }));
    log(`PASS hit ${width}x${height}`);
  }
  await cold.setViewportSize({ width: 430, height: 900 });
  const showFire = button(cold, "Show me how: Keep a fire going");
  if (await showFire.isEnabled()) throw new Error("danger skill was enabled before the gate");
  if ((await cold.getByText("Open a gap so air hits the base.").count()) !== 0) throw new Error("danger skill steps were visible");
  if ((await cold.getByText("Do not light a fire in a closed tent.").count()) !== 0) throw new Error("nested danger skill was visible");
  await pointerHold(cold, cold.locator("[data-step='fire.hypothermia.h4'] [data-hold-handle]"), 700);
  if (await showFire.isEnabled()) throw new Error("500ms step hold unlocked the skill");
  if ((await cold.getByText("Open a gap so air hits the base.").count()) !== 0) throw new Error("500ms step hold revealed the skill");
  const gate = button(cold, "Get a grown-up: hold 3 seconds");
  await gate.scrollIntoViewIfNeeded();
  const gateBox = await gate.boundingBox();
  if (!gateBox || gateBox.height < 48) throw new Error("gate tap target");
  await cold.mouse.move(gateBox.x + gateBox.width / 2, gateBox.y + gateBox.height / 2);
  await cold.mouse.down();
  await cold.waitForTimeout(1500);
  await cold.mouse.up();
  if (await showFire.isEnabled()) throw new Error("short gate hold unlocked the skill");
  await cold.mouse.move(gateBox.x + gateBox.width / 2, gateBox.y + gateBox.height / 2);
  await cold.mouse.down();
  await cold.waitForTimeout(3300);
  await cold.mouse.up();
  await cold.waitForTimeout(200);
  if (!(await showFire.isEnabled())) throw new Error("grown-up gate did not unlock");
  await expandOpenSkills(cold);
  await cold.getByText("Open a gap so air hits the base.").waitFor();
  await cold.getByText("Do not light a fire in a closed tent.").waitFor();
  await cold.locator("[data-node='fire.hypothermia']").screenshot({ path: "evidence/phase-1b/skill-kid.png" });
  log("PASS kid gate 430x900");
  log("PASS kid skill gate");

  if (leaked.length) throw new Error(`network after offline: ${leaked.join(" | ")}`);
  if (errors.length) throw new Error(errors.join(" | "));
  log("PASS offline zero requests of any origin");
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  writeFileSync("evidence/phase-1b/e2e.log", lines.join("\n") + "\n");
  await browser.close();
  stopPreview();
  process.exit(0);
} catch (error) {
  log(`FAIL ${error.stack || error}`);
  writeFileSync("evidence/phase-1/e2e.log", lines.join("\n") + "\n");
  writeFileSync("evidence/phase-1b/e2e.log", lines.join("\n") + "\n");
  stopPreview();
  process.exit(1);
}
