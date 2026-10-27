import { describe, expect, it } from "vitest";
import { resolveSubstitution } from "./resolver";
import type { Context, Substitution } from "./types";

const sub: Substitution = {
  id: "tinder",
  need: "tinder",
  pictogram: "tinder",
  fallback_node: "fire.method.feather",
  alternatives: [
    {
      item: "cotton",
      pictogram: "cotton",
      requires: ["cotton_balls"],
      how_to: "Fluff it.",
    },
    {
      item: "grass",
      pictogram: "grass",
      biomes: ["desert"],
      avoid_weather: ["wet"],
      how_to: "Twist a nest.",
      caveats: "Dry only.",
    },
    {
      item: "open",
      pictogram: "leaves",
      biomes: [],
      how_to: "Anything dry.",
    },
  ],
};

function ctx(partial: Partial<Context>): Context {
  return {
    biome: "temperate_forest",
    season: "summer",
    weather: "dry",
    inventory: [],
    injuries: [],
    party_size: 2,
    daylight: true,
    flags: {},
    ...partial,
  };
}

describe("resolver", () => {
  it("prefers the first alternative the inventory can support", () => {
    const resolved = resolveSubstitution(sub, ctx({ inventory: ["cotton_balls"] }));
    expect(resolved.status).toBe("alternative");
    expect(resolved.item).toBe("cotton");
  });

  it("skips weather and biome misses, then uses a later fit", () => {
    const wetDesert = resolveSubstitution(sub, ctx({ biome: "desert", weather: "wet" }));
    expect(wetDesert.item).toBe("open");
    const dryDesert = resolveSubstitution(sub, ctx({ biome: "desert", weather: "dry" }));
    expect(dryDesert.item).toBe("grass");
    expect(dryDesert.caveats).toMatch(/Dry/);
  });

  it("falls through when nothing matches", () => {
    const empty: Substitution = { ...sub, alternatives: [{ item: "only cotton", pictogram: "cotton", requires: ["cotton_balls"], how_to: "No." }] };
    const resolved = resolveSubstitution(empty, ctx({}));
    expect(resolved.status).toBe("fallback");
    expect(resolved.fallback_node).toBe("fire.method.feather");
    expect(resolved.pictogram).toBe("tinder");
  });
});
