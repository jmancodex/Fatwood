import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fireTree } from "../trees/fire";
import type { Glossary, Skill } from "./types";
import { validateTeach } from "./validate";

function load(): { skills: Skill[]; glossary: Glossary } {
  const skills = readdirSync("content/skills")
    .filter((file) => file.endsWith(".json"))
    .map((file) => JSON.parse(readFileSync(`content/skills/${file}`, "utf8")) as Skill);
  const glossary = JSON.parse(readFileSync("content/glossary.json", "utf8")) as Glossary;
  return { skills, glossary };
}

describe("teach validator", () => {
  it("covers every fire step and keeps the reading level", () => {
    const { skills, glossary } = load();
    const report = validateTeach([fireTree], skills, glossary);
    expect(report.errors).toEqual([]);
    expect(report.coverage).toBe(1);
    expect(report.unknown).toEqual([]);
    expect(report.orphans).toEqual([]);
    expect(report.actionable).toBe(report.linked + report.atomic);
    expect(report.readout.every((row) => row.mean <= 5 && row.max <= 6)).toBe(true);
  });
});
