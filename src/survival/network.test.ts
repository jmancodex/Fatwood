import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx") ? [path] : [];
  });
}

describe("offline content", () => {
  it("does not call the network from the guide", () => {
    const paths = [...files("src/survival"), ...files("src/components/guide"), ...files("src/routes")];
    const banned = /fetch\s*\(|XMLHttpRequest|axios|WebSocket|https?:\/\//;
    const hits = paths.flatMap((path) => {
      const text = readFileSync(path, "utf8");
      return banned.test(text) ? [path] : [];
    });
    expect(hits).toEqual([]);
  });
});
