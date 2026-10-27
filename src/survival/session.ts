import type { Context } from "./types";

export const SESSION_KEY = "fatwood.session.v1";

export interface Kv {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SavedSession {
  treeId: string;
  nodeId: string;
  context: Context;
  history: string[];
  adultUnlocked: string[];
  /** Skill panel keys open on this node. Resume restores them. */
  expanded: string[];
  updatedAt: string;
}

export function saveSession(session: SavedSession, storage: Kv): void {
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(storage: Kv): SavedSession | null {
  const raw = storage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedSession>;
    if (!parsed || typeof parsed.treeId !== "string" || typeof parsed.nodeId !== "string") {
      return null;
    }
    if (!parsed.context || !Array.isArray(parsed.history)) return null;
    return {
      treeId: parsed.treeId,
      nodeId: parsed.nodeId,
      context: parsed.context,
      history: parsed.history,
      adultUnlocked: Array.isArray(parsed.adultUnlocked) ? parsed.adultUnlocked : [],
      expanded: Array.isArray(parsed.expanded) ? parsed.expanded : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : "",
    };
  } catch {
    return null;
  }
}

export function clearSession(storage: Kv): void {
  storage.removeItem(SESSION_KEY);
}
