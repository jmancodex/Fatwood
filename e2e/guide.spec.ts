import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function clearAndOpen(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole("heading", { name: "Where are you?" })).toBeVisible();
}

async function onboard(page: Page, biome: string, weather: string) {
  await page.getByRole("button", { name: biome }).click();
  await page.getByRole("button", { name: new RegExp(`^${weather}$|${weather}`, "i") }).click();
  await page.getByRole("button", { name: "This is where I am" }).click();
  await expect(page.getByRole("button", { name: "I need" })).toBeVisible();
}

async function addGear(page: Page, name: string) {
  await page.getByRole("button", { name: "What I have" }).click();
  await page.getByRole("button", { name }).click();
  await page.getByRole("button", { name: "Back" }).click();
}

async function openFire(page: Page) {
  await page.getByRole("button", { name: "I need" }).click();
  await page.getByRole("button", { name: "Fire" }).click();
}

async function finishToExtinguish(page: Page, lay: string) {
  await page.getByRole("button", { name: "Choose the fire lay" }).click();
  await page.getByRole("button", { name: lay }).click();
  await page.getByRole("button", { name: "If it struggles, troubleshoot" }).click();
  await page.getByRole("button", { name: "It is burning steadily" }).click();
  await page.getByRole("button", { name: "Extinguish before you leave" }).click();
  await expect(page.getByText("Fully extinguish: drown, stir, drown again")).toBeVisible();
}

test("shell, contrast, and motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await clearAndOpen(page);
  await expect(page.getByRole("button", { name: "Temperate forest" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Boreal / snow" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Desert" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tropical jungle" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Grassland" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coast" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Alpine" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Urban ruin" })).toBeVisible();
  await onboard(page, "Temperate forest", "Dry");
  await expect(page.getByRole("button", { name: "I want" })).toBeVisible();
  await expect(page.getByRole("button", { name: "I need" })).toBeVisible();
  await expect(page.getByRole("button", { name: "First aid" })).toBeDisabled();
  await page.getByRole("button", { name: "I need" }).click();
  await expect(page.getByRole("button", { name: "Water" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Food" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Fire" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Shelter" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Signaling and navigation" })).toBeDisabled();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("checkbox", { name: "Red night vision" }).check();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.theme)).toBe("night");
  const motion = await page.evaluate(() => getComputedStyle(document.documentElement).animationDuration);
  expect(motion === "0.01ms" || motion === "0s").toBeTruthy();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2aa"]).analyze();
  const serious = axe.violations.filter((item) => item.impact === "serious" || item.impact === "critical");
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});

test("kid mode gates fire steps", async ({ page }) => {
  await clearAndOpen(page);
  await onboard(page, "Temperate forest", "Dry");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("checkbox", { name: "Kid mode" }).check();
  await page.getByRole("button", { name: "Back" }).click();
  await openFire(page);
  await page.getByRole("button", { name: "Someone is too cold" }).click();
  await expect(page.getByText("Someone is too cold. Block the wind")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Dry" }).click();
  await expect(page.getByTestId("grownup-gate")).toBeVisible();
  await expect(page.getByText("Look up. Do not build under dead branches")).toHaveCount(0);
  const hold = page.getByRole("button", { name: "Press and hold to show the steps" });
  const box = await hold.boundingBox();
  expect(box && box.height).toBeGreaterThanOrEqual(48);
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect(page.getByText("Look up for dead branches.")).toBeVisible();
});

test("save and resume", async ({ page }) => {
  await clearAndOpen(page);
  await onboard(page, "Coast", "Dry");
  await openFire(page);
  await page.getByRole("button", { name: "Warmth or hypothermia" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume where you left off" })).toBeVisible();
  await page.getByRole("button", { name: "Resume where you left off" }).click();
  await expect(page.locator("[data-node='fire.hypothermia']")).toBeVisible();
});

test("offline golden traversals make no network calls", async ({ page, context }) => {
  const sameOriginNetwork: string[] = [];
  await page.goto("/");
  await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    await ready.update().catch(() => undefined);
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await context.setOffline(true);
  page.on("response", (response) => {
    if (response.url().startsWith("http://127.0.0.1:8081") && !response.fromServiceWorker()) {
      sameOriginNetwork.push(response.url());
    }
  });
  await page.reload();
  await expect(page.getByText("Fatwood")).toBeVisible();

  await clearAndOpen(page);
  await onboard(page, "Boreal / snow", "Wet");
  await addGear(page, "Ferro rod");
  await openFire(page);
  await page.getByRole("button", { name: "Warmth or hypothermia" }).click();
  await page.getByRole("button", { name: "Choose the fire for these conditions" }).click();
  await page.getByRole("button", { name: "Wet" }).click();
  await expect(page.getByText("birch", { exact: false }).or(page.getByText("fatwood", { exact: false })).first()).toBeVisible();
  await page.getByRole("button", { name: "Choose how you will light it" }).click();
  await page.getByRole("button", { name: "Ferro rod" }).click();
  await finishToExtinguish(page, "Lean-to");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset this guide" }).click();
  await onboard(page, "Desert", "Dry");
  await openFire(page);
  await page.getByRole("button", { name: "Warmth or hypothermia" }).click();
  await page.getByRole("button", { name: "Choose the fire for these conditions" }).click();
  await page.getByRole("button", { name: "No wood" }).click();
  await expect(page.getByText(/dung|grass/i).first()).toBeVisible();
  await page.getByRole("button", { name: "Pick the site" }).click();
  await page.getByRole("button", { name: "Gather tinder, kindling, and fuel" }).click();
  await page.getByRole("button", { name: "Choose how you will light it" }).click();
  await page.getByRole("button", { name: "Hand drill" }).click();
  await expect(page.getByText("no-gear method for dry climates")).toBeVisible();
  await finishToExtinguish(page, "Teepee");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset this guide" }).click();
  await onboard(page, "Coast", "Dry");
  await addGear(page, "Lighter");
  await openFire(page);
  await page.getByRole("button", { name: "Warmth or hypothermia" }).click();
  await page.getByRole("button", { name: "Choose the fire for these conditions" }).click();
  await page.getByRole("button", { name: "Dry" }).click();
  await page.getByRole("button", { name: "Gather tinder, kindling, and fuel" }).click();
  await expect(page.getByText("high-tide line")).toBeVisible();
  await page.getByRole("button", { name: "Choose how you will light it" }).click();
  await page.getByRole("button", { name: "Lighter" }).click();
  await finishToExtinguish(page, "Teepee");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset this guide" }).click();
  await onboard(page, "Boreal / snow", "Freezing");
  await addGear(page, "Matches");
  await openFire(page);
  await page.getByRole("button", { name: "Warmth or hypothermia" }).click();
  await page.getByRole("button", { name: "Choose the fire for these conditions" }).click();
  await page.getByRole("button", { name: "Snow" }).click();
  const article = page.locator("article");
  const order = await article.evaluate((element) => {
    const text = element.textContent ?? "";
    return {
      warning: text.indexOf("carbon monoxide"),
      step: text.indexOf("Lay two crosswise"),
    };
  });
  expect(order.warning).toBeGreaterThan(-1);
  expect(order.step).toBe(-1);
  await page.getByRole("button", { name: "Gather tinder, kindling, and fuel" }).click();
  await page.getByRole("button", { name: "Choose how you will light it" }).click();
  await page.getByRole("button", { name: "Matches" }).click();
  await page.getByRole("button", { name: "Choose the fire lay" }).click();
  await page.getByRole("button", { name: "Platform on snow" }).click();
  const platformOrder = await page.locator("article").evaluate((element) => {
    const text = element.textContent ?? "";
    return {
      warning: text.indexOf("carbon monoxide"),
      step: text.indexOf("Lay two crosswise"),
    };
  });
  expect(platformOrder.warning).toBeGreaterThan(-1);
  expect(platformOrder.step).toBeGreaterThan(platformOrder.warning);
  await page.getByRole("button", { name: "If it struggles, troubleshoot" }).click();
  await page.getByRole("button", { name: "It is burning steadily" }).click();
  await page.getByRole("button", { name: "Extinguish before you leave" }).click();
  await expect(page.getByText("Fully extinguish: drown, stir, drown again")).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("button", { name: "Reset this guide" }).click();
  await onboard(page, "Tropical jungle", "Wet");
  await openFire(page);
  await page.getByRole("button", { name: "Warmth or hypothermia" }).click();
  await page.getByRole("button", { name: "Choose the fire for these conditions" }).click();
  await page.getByRole("button", { name: "Wet" }).click();
  await page.getByRole("button", { name: "Gather tinder, kindling, and fuel" }).click();
  await expect(page.getByText("feather stick", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Choose how you will light it" }).click();
  await page.getByRole("button", { name: "Bow drill" }).click();
  await expect(page.getByText("no-gear method")).toBeVisible();

  expect(sameOriginNetwork, sameOriginNetwork.join("\n")).toEqual([]);
});
