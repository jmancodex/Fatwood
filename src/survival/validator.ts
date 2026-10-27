import { pictogramIds } from "./pictograms/catalog";
import type { ItemDef, Tree } from "./types";

const BANNED = /TODO|TBD|lorem|stub|placeholder|coming soon/i;

export interface ValidationReport {
  errors: string[];
  pictogram: {
    used: number;
    known: number;
    missing: string[];
    unknown: string[];
    coverage: number;
  };
  biomes: string[];
}

function pushPictogram(
  id: string | undefined,
  where: string,
  known: Set<string>,
  unknown: Set<string>,
  used: Set<string>,
  errors: string[],
) {
  if (!id) {
    errors.push(`${where} is missing a pictogram id`);
    unknown.add(`${where}:<empty>`);
    return;
  }
  used.add(id);
  if (!known.has(id)) {
    errors.push(`${where} has unknown pictogram "${id}"`);
    unknown.add(id);
  }
}

export function validateTree(
  tree: Tree,
  options?: { safety?: readonly string[]; items?: ItemDef[] },
): ValidationReport {
  const errors: string[] = [];
  const known = new Set(pictogramIds());
  const used = new Set<string>();
  const unknown = new Set<string>();
  const ids = tree.nodes.map((node) => node.id);
  const idSet = new Set(ids);
  if (ids.length !== idSet.size) errors.push("duplicate node ids");
  if (!idSet.has(tree.entry_node)) errors.push(`entry node ${tree.entry_node} does not exist`);

  const byId = new Map(tree.nodes.map((node) => [node.id, node]));
  const biomes = new Set<string>();

  for (const node of tree.nodes) {
    const blob = JSON.stringify(node);
    if (BANNED.test(blob)) errors.push(`${node.id} contains a banned token`);
    if (!node.text.trim()) errors.push(`${node.id} has empty text`);
    if (!node.kid_text.trim()) errors.push(`${node.id} has empty kid_text`);
    pushPictogram(node.pictogram, `${node.id} node`, known, unknown, used, errors);

    if (node.type === "instruction" && node.steps.length === 0) {
      errors.push(`${node.id} instruction has no steps`);
    }
    if (node.type !== "terminal" && node.options.length === 0) {
      errors.push(`${node.id} has no exit`);
    }
    if (node.type !== "terminal") {
      const open = node.options.some((option) => !option.conditions || option.conditions.length === 0);
      if (!open) errors.push(`${node.id} has no unconditional exit`);
    }

    for (const step of node.steps) {
      if (!step.text.trim() || !step.kid_text.trim()) errors.push(`${node.id} step ${step.id} has empty text`);
      pushPictogram(step.pictogram, `${node.id} step ${step.id}`, known, unknown, used, errors);
    }
    for (const option of node.options) {
      if (!option.label.trim() || !option.kid_label.trim()) {
        errors.push(`${node.id} option ${option.id} has empty label`);
      }
      if (!idSet.has(option.next)) errors.push(`${node.id} option ${option.id} next ${option.next} is missing`);
      pushPictogram(option.pictogram, `${node.id} option ${option.id}`, known, unknown, used, errors);
    }
    for (const sub of node.substitutions ?? []) {
      pushPictogram(sub.pictogram, `${node.id} sub ${sub.id}`, known, unknown, used, errors);
      if (!idSet.has(sub.fallback_node)) {
        errors.push(`${node.id} substitution ${sub.id} fallback ${sub.fallback_node} is missing`);
      }
      if (sub.alternatives.length === 0) errors.push(`${node.id} substitution ${sub.id} has no alternatives`);
      for (const alt of sub.alternatives) {
        if (!alt.how_to.trim()) errors.push(`${node.id} alt ${alt.item} has empty how_to`);
        pushPictogram(alt.pictogram, `${node.id} alt ${alt.item}`, known, unknown, used, errors);
        for (const biome of alt.biomes ?? []) biomes.add(biome);
      }
    }
  }

  for (const item of options?.items ?? []) {
    pushPictogram(item.pictogram, `item ${item.id}`, known, unknown, used, errors);
    if (!item.label.trim()) errors.push(`item ${item.id} has empty label`);
  }

  const seen = new Set<string>();
  const queue = [tree.entry_node];
  while (queue.length > 0) {
    const id = queue.pop();
    if (!id || seen.has(id) || !byId.has(id)) continue;
    seen.add(id);
    const node = byId.get(id)!;
    for (const option of node.options) queue.push(option.next);
    for (const sub of node.substitutions ?? []) queue.push(sub.fallback_node);
  }
  for (const id of idSet) {
    if (!seen.has(id)) errors.push(`unreachable node ${id}`);
  }

  const color = new Map<string, number>();
  const dfs = (id: string) => {
    color.set(id, 1);
    const node = byId.get(id);
    if (!node) return;
    for (const option of node.options) {
      const state = color.get(option.next) ?? 0;
      if (state === 1 && !option.retry) errors.push(`cycle ${id} -> ${option.next} without retry`);
      else if (state === 0) dfs(option.next);
    }
    color.set(id, 2);
  };
  if (byId.has(tree.entry_node)) dfs(tree.entry_node);

  if (biomes.size < 4) {
    errors.push(`section ${tree.section} substitutions cover ${biomes.size} biomes; need at least 4`);
  }

  for (const line of options?.safety ?? []) {
    const present = tree.nodes.some((node) => (node.safety ?? []).includes(line));
    if (!present) errors.push(`missing safety line: ${line}`);
  }

  const missing = [...unknown];
  const coverage = used.size === 0 ? 0 : (used.size - unknown.size) / used.size;
  return {
    errors,
    pictogram: {
      used: used.size,
      known: known.size,
      missing: tree.nodes
        .filter((node) => !node.pictogram)
        .map((node) => node.id),
      unknown: missing,
      coverage: unknown.size === 0 && used.size > 0 ? 1 : coverage,
    },
    biomes: [...biomes].sort(),
  };
}

export function bannedHits(value: string): string[] {
  const hits: string[] = [];
  const re = /TODO|TBD|lorem|stub|placeholder|coming soon/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(value))) hits.push(match[0]);
  return hits;
}
