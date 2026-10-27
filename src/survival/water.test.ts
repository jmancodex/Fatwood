import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { walk } from "./engine";
import { WATER_SAFETY, WATER_SAFETY_STRINGS } from "./safety";
import { waterTree } from "./trees/water";
import type { Context } from "./types";
import { BIOMES, WEATHERS } from "./types";
import { bannedHits, validateTree } from "./validator";
import { ITEMS } from "./items";

function ctx(partial: Partial<Context> & Pick<Context, "biome">): Context {
  return {
    season: "summer",
    weather: "hot",
    inventory: [],
    injuries: [],
    party_size: 1,
    daylight: true,
    flags: {},
    ...partial,
  };
}

function ids(result: ReturnType<typeof walk>): string[] {
  return result.trace.map((event) => event.nodeId);
}

function writeTrace(name: string, result: ReturnType<typeof walk>) {
  mkdirSync("evidence/phase-2", { recursive: true });
  writeFileSync(
    `evidence/phase-2/trace-${name}.json`,
    JSON.stringify(
      {
        ended: result.ended,
        deadEnd: result.deadEnd,
        finalNodeId: result.finalNodeId,
        path: result.trace.map((event) => ({
          nodeId: event.nodeId,
          optionId: event.optionId,
          safety: event.safety,
          no_gear: event.no_gear === true,
          substitutions: event.substitutions.map((item) => item.item ?? item.status),
        })),
      },
      null,
      2,
    ),
  );
}

describe("water golden traversals", () => {
  it("desert with no gear digs a wash and finishes in the sun bottle", () => {
    const result = walk(waterTree, ctx({ biome: "desert", weather: "hot", inventory: [] }));
    expect(result.deadEnd).toBe(false);
    expect(result.ended).toBe(true);
    expect(ids(result)).toContain("water.wash");
    expect(ids(result)).toContain("water.sodis");
    const wash = result.trace.find((event) => event.nodeId === "water.wash");
    expect(wash?.steps.join(" ")).toMatch(/outer bend/i);
    const sodis = result.trace.find((event) => event.nodeId === "water.sodis");
    expect(sodis?.steps.join(" ")).toMatch(/6 hours of full sun/);
    expect(sodis?.steps.join(" ")).toMatch(/2 days/);
    expect(sodis?.no_gear).toBe(true);
    writeTrace("desert-wash-sodis", result);
  });

  it("boreal with a stove melts snow and boils it", () => {
    const result = walk(waterTree, ctx({ biome: "boreal/snow", weather: "freezing", inventory: ["stove"] }));
    expect(result.ended).toBe(true);
    expect(ids(result)).toContain("water.melt");
    expect(ids(result)).toContain("water.boil");
    const melt = result.trace.find((event) => event.nodeId === "water.melt");
    expect(melt?.safety).toContain(WATER_SAFETY.snow);
    expect(melt?.safetyBeforeSteps).toBe(true);
    const boil = result.trace.find((event) => event.nodeId === "water.boil");
    expect(boil?.safety).toContain(WATER_SAFETY.boil);
    writeTrace("boreal-stove-boil", result);
  });

  it("coastal water is a beach well, a boil, and the seawater warning", () => {
    const result = walk(waterTree, ctx({ biome: "coastal", weather: "dry", inventory: [] }));
    expect(ids(result)).toContain("water.beach");
    expect(ids(result)).toContain("water.boil");
    const beach = result.trace.find((event) => event.nodeId === "water.beach");
    expect(beach?.safety).toContain(WATER_SAFETY.seawater);
    expect(beach?.text.toLowerCase()).toContain("first dune");
    expect(beach?.safetyBeforeSteps).toBe(true);
    writeTrace("coastal-beach-boil", result);
  });

  it("urban water comes from the heater tank, not the toilet bowl", () => {
    const result = walk(waterTree, ctx({ biome: "urban_ruin", weather: "dry", inventory: [] }));
    expect(ids(result)).toContain("water.heater");
    const heater = result.trace.find((event) => event.nodeId === "water.heater");
    expect(heater?.steps.join(" ")).toMatch(/toilet tank/i);
    expect(heater?.steps.join(" ")).toMatch(/bowl/);
    expect(result.ended).toBe(true);
    writeTrace("urban-heater", result);
  });

  it("does not dead-end in any biome, and every safety line is on the tree before steps", () => {
    for (const biome of BIOMES) {
      for (const weather of WEATHERS) {
        const result = walk(waterTree, ctx({ biome, weather, inventory: [] }));
        expect(result.deadEnd, `${biome} ${weather}`).toBe(false);
        expect(result.ended, `${biome} ${weather}`).toBe(true);
      }
    }
    for (const line of WATER_SAFETY_STRINGS) {
      const host = waterTree.nodes.find((node) => node.safety?.includes(line));
      expect(host, line).toBeTruthy();
      const result = walk(waterTree, ctx({ biome: "coastal" }));
      expect(result.trace.every((event) => event.safetyBeforeSteps)).toBe(true);
    }
    const report = validateTree(waterTree, { safety: WATER_SAFETY_STRINGS, items: ITEMS });
    expect(report.errors).toEqual([]);
    expect(report.pictogram.coverage).toBe(1);
    expect(bannedHits(JSON.stringify(waterTree))).toEqual([]);
  });
});
