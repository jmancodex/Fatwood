import { describe, expect, it } from "vitest";
import { clearSession, loadSession, saveSession, SESSION_KEY, type Kv, type SavedSession } from "./session";
import type { Context } from "./types";

function memory(): Kv {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

const context: Context = {
  biome: "coastal",
  season: "winter",
  weather: "wet",
  inventory: ["lighter"],
  injuries: [],
  party_size: 1,
  daylight: false,
  flags: { purpose: "signal" },
};

describe("session", () => {
  it("saves and resumes a walk", () => {
    const store = memory();
    const session: SavedSession = {
      treeId: "fire",
      nodeId: "fire.site",
      context,
      history: ["fire.why"],
      adultUnlocked: [],
      updatedAt: "2026-10-27T00:00:00.000Z",
    };
    expect(loadSession(store)).toBeNull();
    saveSession(session, store);
    expect(store.getItem(SESSION_KEY)).toContain("fire.site");
    expect(loadSession(store)?.nodeId).toBe("fire.site");
    clearSession(store);
    expect(loadSession(store)).toBeNull();
  });

  it("rejects corrupt and incomplete payloads", () => {
    const store = memory();
    store.setItem(SESSION_KEY, "{");
    expect(loadSession(store)).toBeNull();
    store.setItem(SESSION_KEY, JSON.stringify({ treeId: 3 }));
    expect(loadSession(store)).toBeNull();
    store.setItem(SESSION_KEY, JSON.stringify({ treeId: "fire", nodeId: "x" }));
    expect(loadSession(store)).toBeNull();
  });
});
