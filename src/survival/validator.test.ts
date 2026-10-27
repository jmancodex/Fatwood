import { describe, expect, it } from "vitest";
import { ITEMS } from "./items";
import { FIRE_SAFETY_STRINGS } from "./safety";
import { fireTree } from "./trees/fire";
import { bannedHits, validateTree } from "./validator";
import type { Tree } from "./types";

describe("validator", () => {
  it("accepts the fire tree, every safety line, and full pictogram coverage", () => {
    const report = validateTree(fireTree, { safety: FIRE_SAFETY_STRINGS, items: ITEMS });
    expect(report.errors).toEqual([]);
    expect(report.pictogram.unknown).toEqual([]);
    expect(report.pictogram.coverage).toBe(1);
    expect(report.biomes.length).toBeGreaterThanOrEqual(4);
    expect(bannedHits(JSON.stringify(fireTree))).toEqual([]);
  });

  it("flags orphans, missing next, cycles, empty copy, and unknown pictograms", () => {
    const bad: Tree = {
      id: "bad",
      title: "Bad",
      version: "0",
      section: "bad",
      entry_node: "a",
      nodes: [
        {
          id: "a",
          type: "instruction",
          text: " ",
          kid_text: "",
          pictogram: "not-a-real-icon",
          steps: [],
          options: [
            { id: "loop", label: "", kid_label: "", next: "a", pictogram: "nope" },
          ],
        },
        {
          id: "orphan",
          type: "terminal",
          text: "Lost",
          kid_text: "Lost",
          pictogram: "fire",
          steps: [],
          options: [],
        },
      ],
    };
    const report = validateTree(bad, { safety: ["missing line"] });
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors.some((line) => line.includes("unreachable"))).toBe(true);
    expect(report.errors.some((line) => line.includes("cycle"))).toBe(true);
    expect(report.pictogram.unknown.length).toBeGreaterThan(0);
  });
});
