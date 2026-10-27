import { mkdirSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { autoChoose, matchesCondition, optionMatches, walk } from "./engine";
import { FIRE_SAFETY_STRINGS } from "./safety";
import { fireTree } from "./trees/fire";
import type { Context, Tree } from "./types";

function ctx(partial: Partial<Context> & Pick<Context, "biome">): Context {
  return {
    season: "autumn",
    weather: "dry",
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

describe("fire golden traversals", () => {
  it("boreal wet ferro reaches fatwood or birch, ferro, and lean-to", () => {
    const result = walk(
      fireTree,
      ctx({ biome: "boreal/snow", weather: "wet", inventory: ["ferro_rod"] }),
    );
    expect(result.deadEnd).toBe(false);
    expect(result.ended).toBe(true);
    const subs = result.trace.flatMap((event) => event.substitutions);
    expect(subs.some((item) => /fatwood|birch/i.test(item.item ?? ""))).toBe(true);
    expect(ids(result)).toContain("fire.method.ferro");
    expect(ids(result)).toContain("fire.lay.leanto");
    writeTrace("a-boreal-wet-ferro", result);
  });

  it("desert with nothing uses dung or grass and the hand drill", () => {
    const result = walk(fireTree, ctx({ biome: "desert", weather: "dry", inventory: [] }));
    expect(result.deadEnd).toBe(false);
    const subs = result.trace.flatMap((event) => event.substitutions);
    expect(subs.some((item) => /dung|grass/i.test(item.item ?? ""))).toBe(true);
    expect(ids(result)).toContain("fire.method.hand");
    expect(result.trace.some((event) => event.no_gear)).toBe(true);
    writeTrace("b-desert-hand", result);
  });

  it("coastal lighter uses driftwood above the tide line", () => {
    const result = walk(fireTree, ctx({ biome: "coastal", weather: "dry", inventory: ["lighter"] }));
    expect(ids(result)).toContain("fire.method.lighter");
    const drift = result.trace
      .flatMap((event) => event.substitutions)
      .find((item) => /driftwood/i.test(item.item ?? ""));
    expect(drift?.how_to ?? "").toMatch(/high-tide line/i);
    expect(drift?.caveats ?? "").toMatch(/Saltwater-soaked/);
    writeTrace("c-coastal-lighter", result);
  });

  it("snow and matches shows the platform and the monoxide warning before steps", () => {
    const result = walk(
      fireTree,
      ctx({ biome: "boreal/snow", weather: "freezing", inventory: ["matches"] }),
    );
    expect(ids(result)).toContain("fire.method.matches");
    expect(ids(result)).toContain("fire.lay.platform");
    const platform = result.trace.find((event) => event.nodeId === "fire.lay.platform");
    expect(platform?.safety[0]).toBe(FIRE_SAFETY_STRINGS[0]);
    expect(platform?.safetyBeforeSteps).toBe(true);
    expect(platform?.steps.length).toBeGreaterThan(0);
    writeTrace("d-snow-matches", result);
  });

  it("empty inventory never dead-ends and reaches a no-gear method in every biome", () => {
    const biomes = [
      "temperate_forest",
      "boreal/snow",
      "desert",
      "tropical/jungle",
      "grassland",
      "coastal",
      "alpine",
      "urban_ruin",
    ] as const;
    for (const biome of biomes) {
      for (const weather of ["dry", "wet", "freezing", "hot"] as const) {
        const result = walk(fireTree, ctx({ biome, weather, inventory: [] }));
        expect(result.deadEnd, `${biome} ${weather}`).toBe(false);
        expect(result.ended, `${biome} ${weather}`).toBe(true);
        expect(result.trace.some((event) => event.no_gear), `${biome} ${weather}`).toBe(true);
      }
    }
  });
});

describe("engine branches", () => {
  const base = ctx({ biome: "desert" });

  it("matches every condition operator", () => {
    expect(matchesCondition({ op: "biome_in", biomes: ["desert"] }, base)).toBe(true);
    expect(matchesCondition({ op: "biome_in", biomes: ["coastal"] }, base)).toBe(false);
    expect(matchesCondition({ op: "weather_in", weather: ["dry"] }, base)).toBe(true);
    expect(matchesCondition({ op: "has_all", items: ["knife"] }, ctx({ biome: "desert", inventory: ["knife"] }))).toBe(true);
    expect(matchesCondition({ op: "has_all", items: ["knife"] }, base)).toBe(false);
    expect(matchesCondition({ op: "has_any", items: ["knife", "lighter"] }, ctx({ biome: "desert", inventory: ["lighter"] }))).toBe(true);
    expect(matchesCondition({ op: "has_any", items: ["knife"] }, base)).toBe(false);
    expect(matchesCondition({ op: "has_none", items: ["lighter"] }, base)).toBe(true);
    expect(matchesCondition({ op: "has_none", items: ["lighter"] }, ctx({ biome: "desert", inventory: ["lighter"] }))).toBe(false);
    expect(matchesCondition({ op: "flag", key: "purpose", value: "cook" }, ctx({ biome: "desert", flags: { purpose: "cook" } }))).toBe(true);
    expect(matchesCondition({ op: "flag", key: "purpose", value: "cook" }, base)).toBe(false);
    expect(matchesCondition({ op: "daylight", value: true }, base)).toBe(true);
    expect(matchesCondition({ op: "daylight", value: false }, ctx({ biome: "desert", daylight: false }))).toBe(true);
    expect(matchesCondition({ op: "injury", id: "hypothermia" }, ctx({ biome: "desert", injuries: ["hypothermia"] }))).toBe(true);
    expect(matchesCondition({ op: "injury", id: "hypothermia" }, base)).toBe(false);
    expect(
      matchesCondition(
        { op: "any", of: [{ op: "biome_in", biomes: ["coastal"] }, { op: "weather_in", weather: ["dry"] }] },
        base,
      ),
    ).toBe(true);
    expect(optionMatches({ id: "x", label: "x", kid_label: "x", next: "n", pictogram: "fire" }, base)).toBe(true);
  });

  it("throws when the entry node is missing", () => {
    const broken: Tree = { ...fireTree, entry_node: "missing" };
    expect(() => walk(broken, base)).toThrow(/Missing entry/);
  });

  it("dead-ends when the choice is missing, the next node is missing, or the walk runs long", () => {
    const tiny: Tree = {
      id: "t",
      title: "t",
      version: "1",
      section: "t",
      entry_node: "a",
      nodes: [
        {
          id: "a",
          type: "question",
          text: "A",
          kid_text: "A",
          pictogram: "question",
          steps: [],
          options: [
            { id: "gone", label: "Gone", kid_label: "Gone", next: "missing", pictogram: "next" },
          ],
        },
      ],
    };
    expect(walk(tiny, base, () => null).deadEnd).toBe(true);
    expect(walk(tiny, base, () => "nope").deadEnd).toBe(true);
    expect(walk(tiny, base).deadEnd).toBe(true);
    const loop: Tree = {
      ...tiny,
      nodes: [
        {
          ...tiny.nodes[0],
          options: [{ id: "again", label: "Again", kid_label: "Again", next: "a", pictogram: "next" }],
        },
      ],
    };
    expect(walk(loop, base, autoChoose, 3).deadEnd).toBe(true);
  });

  it("stops on a non-terminal that has no options", () => {
    const tree: Tree = {
      id: "t",
      title: "t",
      version: "1",
      section: "t",
      entry_node: "a",
      nodes: [
        {
          id: "a",
          type: "instruction",
          text: "Do the thing",
          kid_text: "Do it",
          pictogram: "fire",
          steps: [{ id: "s", text: "Step", kid_text: "Step", pictogram: "fire" }],
          options: [],
        },
      ],
    };
    const result = walk(tree, base);
    expect(result.deadEnd).toBe(true);
    expect(result.ended).toBe(false);
  });

  it("applies option flags", () => {
    const result = walk(fireTree, ctx({ biome: "temperate_forest", weather: "dry" }));
    expect(result.context.flags.purpose).toBe("warmth");
    expect(result.context.flags.condition).toBe("dry");
  });
});

function writeTrace(name: string, result: ReturnType<typeof walk>) {
  mkdirSync("evidence/phase-1", { recursive: true });
  writeFileSync(
    `evidence/phase-1/trace-${name}.json`,
    JSON.stringify(
      {
        ended: result.ended,
        deadEnd: result.deadEnd,
        finalNodeId: result.finalNodeId,
        path: result.trace.map((event) => ({
          nodeId: event.nodeId,
          optionId: event.optionId,
          safety: event.safety,
          substitutions: event.substitutions.map((item) => item.item ?? item.status),
        })),
      },
      null,
      2,
    ),
  );
}
