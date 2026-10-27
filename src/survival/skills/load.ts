import type { Glossary, Skill } from "./types";

const skillModules = import.meta.glob("../../../content/skills/*.json", {
  eager: true,
  import: "default",
}) as Record<string, Skill>;

const glossaryModules = import.meta.glob("../../../content/glossary.json", {
  eager: true,
  import: "default",
}) as Record<string, Glossary>;

export function loadSkills(): Skill[] {
  return Object.values(skillModules).sort((a, b) => a.id.localeCompare(b.id));
}

export function loadGlossary(): Glossary {
  const glossary = Object.values(glossaryModules)[0];
  if (!glossary) throw new Error("content/glossary.json is missing");
  return glossary;
}
