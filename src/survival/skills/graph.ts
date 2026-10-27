import type { Skill } from "./types";

export interface SkillNode {
  id: string;
  depth: number;
  title: string;
  inline: boolean;
  nested: { at: number; node: SkillNode }[];
}

/** Expand a skill under a tree step. Depth 1 is the skill itself. Deeper than 3 is a link. */
export function expandSkill(rootId: string, byId: Map<string, Skill>, depth = 1, stack: string[] = []): SkillNode | null {
  const skill = byId.get(rootId);
  if (!skill) return null;
  const inline = depth <= 3 && !stack.includes(rootId);
  const node: SkillNode = { id: skill.id, depth, title: skill.title, inline, nested: [] };
  if (!inline) return node;
  skill.steps.forEach((step, index) => {
    if (!step.skill) return;
    const child = expandSkill(step.skill, byId, depth + 1, [...stack, skill.id]);
    if (child) node.nested.push({ at: index, node: child });
  });
  return node;
}

export function skillById(skills: Skill[]): Map<string, Skill> {
  return new Map(skills.map((skill) => [skill.id, skill]));
}

/** True when this skill, or one nested within depth 3, is dangerous. */
export function skillIsDangerous(id: string, byId: Map<string, Skill>, depth = 1, stack: string[] = []): boolean {
  if (depth > 3 || stack.includes(id)) return false;
  const skill = byId.get(id);
  if (!skill) return false;
  if (skill.danger !== "none") return true;
  return skill.steps.some((step) => step.skill && skillIsDangerous(step.skill, byId, depth + 1, [...stack, id]));
}

export function graphErrors(skills: Skill[]): string[] {
  const byId = skillById(skills);
  const errors: string[] = [];
  const seenIds = new Set<string>();
  for (const skill of skills) {
    if (seenIds.has(skill.id)) errors.push(`duplicate skill ${skill.id}`);
    seenIds.add(skill.id);
    if (!/^[a-z0-9_]+$/.test(skill.id)) errors.push(`skill id ${skill.id} is not snake_case`);
    walk(skill.id, byId, [], errors);
  }
  return errors;
}

function walk(id: string, byId: Map<string, Skill>, stack: string[], errors: string[]) {
  if (stack.includes(id)) {
    errors.push(`cycle: ${[...stack, id].join(" -> ")}`);
    return;
  }
  const next = [...stack, id];
  if (next.length > 3) {
    errors.push(`depth over 3: ${next.join(" -> ")}`);
    return;
  }
  const skill = byId.get(id);
  if (!skill) {
    errors.push(`unknown skill ${id} on path ${next.join(" -> ")}`);
    return;
  }
  for (const step of skill.steps) {
    if (!step.pictogram) errors.push(`${id} step is missing a pictogram on path ${next.join(" -> ")}`);
    if (step.skill) walk(step.skill, byId, next, errors);
  }
}
