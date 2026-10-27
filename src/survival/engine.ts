import { resolveSubstitution } from "./resolver";
import type {
  Condition,
  Context,
  Node,
  Option,
  TraceEvent,
  Tree,
  WalkResult,
} from "./types";

export function matchesCondition(cond: Condition, ctx: Context): boolean {
  switch (cond.op) {
    case "biome_in":
      return cond.biomes.includes(ctx.biome);
    case "weather_in":
      return cond.weather.includes(ctx.weather);
    case "has_all":
      return cond.items.every((item) => ctx.inventory.includes(item));
    case "has_any":
      return cond.items.some((item) => ctx.inventory.includes(item));
    case "has_none":
      return cond.items.every((item) => !ctx.inventory.includes(item));
    case "flag":
      return ctx.flags[cond.key] === cond.value;
    case "daylight":
      return ctx.daylight === cond.value;
    case "injury":
      return ctx.injuries.includes(cond.id);
    case "any":
      return cond.of.some((inner) => matchesCondition(inner, ctx));
    default: {
      const unreachable: never = cond;
      return unreachable;
    }
  }
}

export function optionMatches(option: Option, ctx: Context): boolean {
  if (!option.conditions || option.conditions.length === 0) return true;
  return option.conditions.every((cond) => matchesCondition(cond, ctx));
}

/** First matching option. Unconditional options belong last so they are the fallback. */
export function autoChoose(node: Node, ctx: Context): string | null {
  for (const option of node.options) {
    if (optionMatches(option, ctx)) return option.id;
  }
  return null;
}

export type ChooseFn = (node: Node, ctx: Context) => string | null;

export function cloneContext(ctx: Context): Context {
  return {
    ...ctx,
    inventory: [...ctx.inventory],
    injuries: [...ctx.injuries],
    flags: { ...ctx.flags },
  };
}

/**
 * Walk a tree from its entry. Safety lines are copied onto the trace event
 * before step text. Stops at a terminal node, a missing choice, or maxSteps.
 */
export function walk(
  tree: Tree,
  startCtx: Context,
  choose: ChooseFn = autoChoose,
  maxSteps = 48,
): WalkResult {
  const ctx = cloneContext(startCtx);
  const byId = new Map(tree.nodes.map((node) => [node.id, node]));
  const entry = byId.get(tree.entry_node);
  if (!entry) throw new Error(`Missing entry node ${tree.entry_node}`);

  const trace: TraceEvent[] = [];
  let node: Node | undefined = entry;
  let guard = 0;

  while (node && guard < maxSteps) {
    guard += 1;
    const safety = [...(node.safety ?? [])];
    const steps = node.steps.map((step) => step.text);
    const event: TraceEvent = {
      nodeId: node.id,
      type: node.type,
      text: node.text,
      safety,
      steps,
      safetyBeforeSteps: true,
      substitutions: (node.substitutions ?? []).map((sub) => resolveSubstitution(sub, ctx)),
      no_gear: node.no_gear === true,
    };
    trace.push(event);

    if (node.type === "terminal" || node.options.length === 0) {
      return {
        trace,
        ended: node.type === "terminal",
        deadEnd: node.type !== "terminal",
        finalNodeId: node.id,
        context: ctx,
      };
    }

    const optionId = choose(node, ctx);
    const option = node.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      return { trace, ended: false, deadEnd: true, finalNodeId: node.id, context: ctx };
    }
    event.optionId = option.id;
    event.next = option.next;
    if (option.sets) Object.assign(ctx.flags, option.sets);

    const next = byId.get(option.next);
    if (!next) {
      return { trace, ended: false, deadEnd: true, finalNodeId: node.id, context: ctx };
    }
    node = next;
  }

  return {
    trace,
    ended: false,
    deadEnd: true,
    finalNodeId: trace[trace.length - 1]?.nodeId ?? tree.entry_node,
    context: ctx,
  };
}
