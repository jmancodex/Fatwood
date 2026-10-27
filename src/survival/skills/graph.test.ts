import { describe, expect, it } from "vitest";
import { graphErrors } from "./graph";
import type { Skill } from "./types";

function skill(id: string, next?: string): Skill {
  return {
    id,
    title: id,
    pictogram: "fire",
    danger: "none",
    kid_text: "Do the thing.",
    safety: [],
    mistakes: [],
    steps: [{ text: "Do this.", pictogram: "fire", ...(next ? { skill: next } : {}) }],
  };
}

describe("skill graph", () => {
  it("fails a cycle with the path", () => {
    const errors = graphErrors([skill("a", "b"), skill("b", "a")]);
    expect(errors.some((line) => line === "cycle: a -> b -> a")).toBe(true);
  });

  it("fails a depth-4 chain with the path", () => {
    const errors = graphErrors([skill("a", "b"), skill("b", "c"), skill("c", "d"), skill("d")]);
    expect(errors.some((line) => line === "depth over 3: a -> b -> c -> d")).toBe(true);
  });
});
